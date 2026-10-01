import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getDividendCalendar } from '../api/dividends';
import type { DividendEvent } from '../api/dividends';
import { monthRange } from '../utils/dividendDate';

/** How long a month must stay in view before it is requested. */
const SETTLE_MS = 250;

/** Resolves after `ms`, or rejects as soon as `signal` aborts. */
function settle(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(id);
        reject(signal.reason);
      },
      { once: true }
    );
  });
}

/** Dividend payouts for the user's holdings in one calendar month, backed by
 *  `GET /dividends/calendar`. Keyed by year + month so stepping the calendar fetches
 *  (and caches) each month on its own. Deliberately no placeholder data: another
 *  month's events would render a believable but wrong grid and total while loading.
 *
 *  An uncached month costs the backend several provider calls, so the request waits
 *  `SETTLE_MS` first: react-query aborts the signal when the view moves on, which
 *  drops the months stepped through on the way. Cached months still show instantly.
 *  Refreshed ~daily server-side, hence the long staleTime. */
export function useDividendCalendar(view: { y: number; m: number }): {
  data: DividendEvent[] | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
} {
  const { token } = useAuth();

  const q = useQuery({
    queryKey: ['dividendCalendar', view.y, view.m],
    queryFn: async ({ signal }) => {
      await settle(SETTLE_MS, signal);
      return getDividendCalendar(token!, monthRange(view.y, view.m), signal);
    },
    enabled: !!token,
    staleTime: 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  return {
    data: q.data,
    isLoading: q.isLoading,
    isError: q.isError,
    refetch: q.refetch,
  };
}
