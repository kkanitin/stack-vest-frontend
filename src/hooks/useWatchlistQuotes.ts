import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getWatchlist } from '../api/watchlist';
import { getStockPriceChange, getStockQuote, getStockHistory } from '../api/stocks';
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
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [watchlistStatus, setWatchlistStatus] = useState<Status>('idle');
  const [watchlistError, setWatchlistError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAll = useCallback(async () => {
    if (!token) return;

    setWatchlistStatus('loading');
    setWatchlistError(null);

    let items: WatchlistItem[];
    try {
      items = await getWatchlist(token);
    } catch (e) {
      setWatchlistStatus('error');
      setWatchlistError(e instanceof Error ? e.message : 'Failed to load watchlist');
      return;
    }

    setWatchlistStatus('success');
    setEntries(items.map(item => ({
      item, priceChange: null, quote: null, history: null, status: 'loading', error: null,
    })));

    const [priceChangeResults, quoteResults, historyResults] = await Promise.all([
      Promise.allSettled(items.map(item => getStockPriceChange(token, item.symbol))),
      Promise.allSettled(items.map(item => getStockQuote(token, item.symbol))),
      Promise.allSettled(items.map(item => getStockHistory(token, item.symbol, '7d'))),
    ]);

    setEntries(
      items.map((item, i) => {
        const pc = priceChangeResults[i];
        const q = quoteResults[i];
        const h = historyResults[i];
        const hasError = pc.status === 'rejected' && q.status === 'rejected';
        return {
          item,
          priceChange: pc.status === 'fulfilled' ? pc.value : null,
          quote:       q.status  === 'fulfilled' ? q.value  : null,
          history:     h.status  === 'fulfilled' ? h.value  : null,
          status: hasError ? 'error' : 'success',
          error: hasError
            ? (pc.reason instanceof Error ? pc.reason.message : 'Unavailable')
            : null,
        };
      })
    );
    setLastUpdated(new Date());
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { entries, watchlistStatus, watchlistError, lastUpdated, refresh: fetchAll };
}
