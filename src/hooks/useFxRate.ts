import { useQuery } from '@tanstack/react-query';
import { getFxRate, type FxRate } from '../api/fx';

const DAY_MS = 24 * 60 * 60_000;
const storageKey = (from: string, to: string) => `stackvest:fx:${from}:${to}`;

/** Today as a local `YYYY-MM-DD`: the cache is kept for one calendar day. */
function localDay(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

interface StoredRate {
  fetchedOn: string;
  fx: FxRate;
}

/** The rate fetched earlier today in this browser, if any. Storage errors count as a miss. */
export function readStoredRate(from: string, to: string): FxRate | undefined {
  try {
    const raw = localStorage.getItem(storageKey(from, to));
    if (!raw) return undefined;
    const stored = JSON.parse(raw) as StoredRate;
    if (stored.fetchedOn !== localDay() || typeof stored.fx?.rate !== 'number') return undefined;
    return stored.fx;
  } catch {
    return undefined;
  }
}

function storeRate(fx: FxRate): void {
  try {
    const stored: StoredRate = { fetchedOn: localDay(), fx };
    localStorage.setItem(storageKey(fx.from, fx.to), JSON.stringify(stored));
  } catch {
    // Private mode or blocked storage: the in-memory query cache still holds it.
  }
}

export interface FxRateState {
  /** Undefined while loading, on failure, or while a code is missing. */
  fx: FxRate | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * Today's rate from `from` to `to` (ISO codes; null = unknown, nothing is fetched). The same
 * currency is rate 1 with no request. Otherwise it is fetched once a day per browser: kept in
 * localStorage for the calendar day and in the query cache for 24 hours.
 */
export function useFxRate(from: string | null, to: string | null): FxRateState {
  const needsRate = !!from && !!to && from !== to;
  const query = useQuery<FxRate>({
    queryKey: ['fx', from, to],
    queryFn: async () => {
      const fx = await getFxRate(from!, to!);
      storeRate(fx);
      return fx;
    },
    enabled: needsRate,
    initialData: () => (needsRate ? readStoredRate(from!, to!) : undefined),
    staleTime: DAY_MS,
    gcTime: DAY_MS,
    retry: 1,
  });

  if (from && to && from === to) {
    return { fx: { from, to, rate: 1, date: localDay() }, isLoading: false, isError: false, refetch: () => {} };
  }
  return {
    fx: needsRate ? query.data : undefined,
    isLoading: needsRate && query.isPending,
    isError: needsRate && query.isError,
    refetch: () => void query.refetch(),
  };
}
