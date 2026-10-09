import { useCallback, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { Benchmark } from '../api/portfolios';

function storageKey(userId: string | undefined): string | null {
  return userId ? `stackvest:benchmark:${userId}` : null;
}

function read(key: string | null): string | null {
  if (!key) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * The benchmark the user last compared against, remembered per signed-in user in this browser.
 * Off by default. A stored symbol that is not in `benchmarks` (or while that list is still
 * loading) is ignored, so the history request never carries a symbol the backend would reject.
 * Returns `[symbol | null, setSymbol]`.
 */
export function useBenchmarkPreference(
  benchmarks: Benchmark[] | undefined
): [string | null, (symbol: string | null) => void] {
  const { user } = useAuth();
  const key = storageKey(user?.id);
  // Remember which key the in-memory choice belongs to, so a different user starts fresh.
  const [state, setState] = useState<{ key: string | null; symbol: string | null }>(() => ({
    key,
    symbol: read(key),
  }));
  const stored = state.key === key ? state.symbol : read(key);
  const symbol = stored && benchmarks?.some(b => b.symbol === stored) ? stored : null;

  const setSymbol = useCallback(
    (next: string | null) => {
      setState({ key, symbol: next });
      if (!key) return;
      try {
        if (next) localStorage.setItem(key, next);
        else localStorage.removeItem(key);
      } catch {
        // Storage can be blocked; the choice then lasts for this visit only.
      }
    },
    [key]
  );

  return [symbol, setSymbol];
}
