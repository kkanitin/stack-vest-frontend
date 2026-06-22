import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { searchStocks } from '../api/stocks';
import type { StockSearchResult } from '../api/stocks';

export type SearchStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseStockSearchResult {
  results: StockSearchResult[];
  status: SearchStatus;
  error: string | null;
}

/**
 * Debounced asset search backed by `GET /stocks/search`.
 * An empty/whitespace query (or `enabled === false`) resets to the idle state.
 */
export function useStockSearch(query: string, enabled = true): UseStockSearchResult {
  const { token } = useAuth();
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!enabled || !token || !trimmed) {
      setResults([]);
      setStatus('idle');
      setError(null);
      return;
    }
    setStatus('loading');
    setError(null);
    const controller = new AbortController();
    const handle = window.setTimeout(async () => {
      try {
        const data = await searchStocks(token, trimmed, { signal: controller.signal });
        setResults(data);
        setStatus('success');
      } catch (err) {
        // Ignore errors from a superseded/cancelled request — a newer query owns the state.
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Search failed');
        setStatus('error');
      }
    }, 300);
    return () => {
      window.clearTimeout(handle);
      controller.abort();
    };
  }, [query, token, enabled]);

  return { results, status, error };
}
