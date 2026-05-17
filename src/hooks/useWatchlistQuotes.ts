import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getWatchlist } from '../api/watchlist';
import { getStockPriceChange } from '../api/stocks';
import type { WatchlistItem } from '../api/watchlist';
import type { StockPriceChange } from '../api/stocks';

type Status = 'idle' | 'loading' | 'success' | 'error';

export interface WatchlistEntry {
  item: WatchlistItem;
  priceChange: StockPriceChange | null;
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
    setEntries(items.map(item => ({ item, priceChange: null, status: 'loading', error: null })));

    const results = await Promise.allSettled(
      items.map(item => getStockPriceChange(token, item.symbol))
    );

    setEntries(
      items.map((item, i) => {
        const r = results[i];
        if (r.status === 'fulfilled') {
          return { item, priceChange: r.value, status: 'success', error: null };
        }
        return {
          item,
          priceChange: null,
          status: 'error',
          error: r.reason instanceof Error ? r.reason.message : 'Unavailable',
        };
      })
    );
    setLastUpdated(new Date());
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { entries, watchlistStatus, watchlistError, lastUpdated, refresh: fetchAll };
}
