import { useMemo, useCallback } from 'react';
import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getWatchlist } from '../api/watchlist';
import {
  getBatchPriceChanges,
  getStockQuote,
  getBatchHistory,
} from '../api/stocks';
import type { WatchlistItem } from '../api/watchlist';
import type { StockPriceChange, StockQuote, StockHistory } from '../api/stocks';

type Status = 'idle' | 'loading' | 'success' | 'error';

export interface WatchlistEntry {
  item: WatchlistItem;
  priceChange: StockPriceChange | null;
  quote: StockQuote | null;
  history: StockHistory | null;
  status: Status;
  error: string | null;
}

export interface UseWatchlistQuotesReturn {
  entries: WatchlistEntry[];
  watchlistStatus: Status;
  watchlistError: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

export function useWatchlistQuotes(): UseWatchlistQuotesReturn {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  // 1. Watchlist items
  const watchlistQuery = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => getWatchlist(token!),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  const items: WatchlistItem[] = watchlistQuery.data ?? [];
  const symbols = useMemo(() => items.map(i => i.symbol).sort(), [items]);

  // 2. Batch price changes — one request for all symbols
  const priceChangesQuery = useQuery({
    queryKey: ['batchPriceChanges', symbols],
    queryFn: () => getBatchPriceChanges(token!, symbols),
    enabled: !!token && symbols.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  // 3. Individual quotes (no batch endpoint)
  const quoteResults = useQueries({
    queries: items.map(item => ({
      queryKey: ['stockQuote', item.symbol],
      queryFn: () => getStockQuote(token!, item.symbol),
      enabled: !!token,
      staleTime: 2 * 60 * 1000,
    })),
  });

  // 4. Batch 7D history for sparklines
  const historyQuery = useQuery({
    queryKey: ['batchHistory', symbols, '7D'],
    queryFn: () => getBatchHistory(token!, symbols, '7D'),
    enabled: !!token && symbols.length > 0,
    staleTime: 10 * 60 * 1000,
  });

  // Combine into WatchlistEntry[]
  const entries: WatchlistEntry[] = useMemo(() => {
    const priceMap = new Map<string, StockPriceChange>(
      (priceChangesQuery.data ?? []).map(pc => [pc.symbol, pc])
    );
    const historyMap = new Map<string, StockHistory>(
      (historyQuery.data ?? []).map(h => [h.symbol, h])
    );

    return items.map((item, i) => {
      const priceChange = priceMap.get(item.symbol) ?? null;
      const quote = (quoteResults[i]?.data as StockQuote | undefined) ?? null;
      const history = historyMap.get(item.symbol) ?? null;
      const isLoading =
        watchlistQuery.isLoading ||
        priceChangesQuery.isLoading ||
        (quoteResults[i]?.isLoading ?? false);
      const isError =
        priceChangesQuery.isError && (quoteResults[i]?.isError ?? false);
      return {
        item,
        priceChange,
        quote,
        history,
        status: isLoading ? 'loading' : isError ? 'error' : 'success',
        error: isError ? 'Unavailable' : null,
      };
    });
  }, [
    items,
    priceChangesQuery.data,
    priceChangesQuery.isLoading,
    priceChangesQuery.isError,
    quoteResults,
    historyQuery.data,
    watchlistQuery.isLoading,
  ]);

  const lastUpdated = useMemo(() => {
    return watchlistQuery.dataUpdatedAt
      ? new Date(watchlistQuery.dataUpdatedAt)
      : null;
  }, [watchlistQuery.dataUpdatedAt]);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    queryClient.invalidateQueries({ queryKey: ['batchPriceChanges'] });
    queryClient.invalidateQueries({ queryKey: ['batchHistory'] });
    items.forEach(item => {
      queryClient.invalidateQueries({ queryKey: ['stockQuote', item.symbol] });
    });
  }, [queryClient, items]);

  const watchlistStatus: Status = !token
    ? 'idle'
    : watchlistQuery.isLoading
    ? 'loading'
    : watchlistQuery.isError
    ? 'error'
    : watchlistQuery.isSuccess
    ? 'success'
    : 'idle';

  const watchlistError =
    watchlistQuery.error instanceof Error
      ? watchlistQuery.error.message
      : null;

  return { entries, watchlistStatus, watchlistError, lastUpdated, refresh };
}
