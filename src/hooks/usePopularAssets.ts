import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getPopularAssets } from '../api/popular';
import { getStockPriceChange } from '../api/stocks';
import type { WatchlistEntry } from './useWatchlistQuotes';

type Status = 'idle' | 'loading' | 'success' | 'error';

export function usePopularAssets(enabled: boolean): {
  entries: WatchlistEntry[];
  status: Status;
} {
  const { token } = useAuth();
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [status, setStatus] = useState<Status>('idle');

  useEffect(() => {
    if (!enabled) {
      setEntries([]);
      setStatus('idle');
      return;
    }

    let cancelled = false;

    async function load() {
      setStatus('loading');
      try {
        const popular = await getPopularAssets();
        if (cancelled) return;

        setEntries(popular.map(p => ({
          item: {
            id: `popular-${p.symbol}`,
            userId: '',
            symbol: p.symbol,
            name: p.name,
            type: p.type,
            addedAt: '',
            alertsEnabled: false,
            category: p.category,
          },
          priceChange: null,
          quote: null,
          history: null,
          status: 'loading',
          error: null,
        })));
        setStatus('success');

        if (!token) return;

        const results = await Promise.allSettled(
          popular.map(p => getStockPriceChange(token, p.symbol))
        );

        if (cancelled) return;

        setEntries(popular.map((p, i) => {
          const r = results[i];
          return {
            item: {
              id: `popular-${p.symbol}`,
              userId: '',
              symbol: p.symbol,
              name: p.name,
              type: p.type,
              addedAt: '',
              alertsEnabled: false,
              category: p.category,
            },
            priceChange: r.status === 'fulfilled' ? r.value : null,
            quote: null,
            history: null,
            status: r.status === 'fulfilled' ? 'success' : 'error',
            error: r.status === 'rejected' ? String(r.reason) : null,
          };
        }));
      } catch {
        if (!cancelled) setStatus('error');
      }
    }

    load();
    return () => { cancelled = true; };
  }, [enabled, token]);

  return { entries, status };
}
