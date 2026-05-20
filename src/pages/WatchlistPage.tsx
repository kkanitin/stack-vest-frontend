import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getWatchlist, deleteFromWatchlist } from '../api/watchlist';
import type { WatchlistItem } from '../api/watchlist';
import AddAssetModal from '../components/AddAssetModal';
import Button from '../components/ui/Button';
import './WatchlistPage.css';

// TODO(mock): price, 24h change, 7d sparkline, and alerts state all need real
// backend feeds (quotes endpoint + per-symbol historical + alert subscription).
// We seed deterministic mock values keyed off the symbol so a given asset
// always renders the same fake values across reloads.
interface MockMarket {
  price: number;
  change: number;
  series: number[];
}

function hashSymbol(symbol: string): number {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) >>> 0;
  return h;
}

function mockMarket(symbol: string): MockMarket {
  const seed = hashSymbol(symbol);
  const price = 20 + (seed % 47000) / 10;
  const change = ((seed % 1000) / 100) - 5; // -5..+5
  const series: number[] = [];
  let val = price;
  let s = seed;
  for (let i = 0; i < 14; i++) {
    s = (s * 1103515245 + 12345) >>> 0;
    const step = ((s % 200) - 100) / 1000;
    val = val * (1 + step);
    series.push(val);
  }
  return { price, change, series };
}

function Sparkline({ values, positive }: { values: number[]; positive: boolean }) {
  const w = 80;
  const h = 24;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="wl-spark">
      <polyline
        points={pts}
        fill="none"
        stroke={positive ? 'var(--success)' : 'var(--loss)'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function fmtPrice(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

const WatchlistPage: React.FC = () => {
  const { token } = useAuth();

  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // TODO(mock): per-row alerts toggle is local-only until backend exists.
  const [alerts, setAlerts] = useState<Record<string, boolean>>({});

  const addedSymbols = useMemo(() => new Set(watchlist.map(w => w.symbol)), [watchlist]);

  const load = useCallback(async () => {
    if (!token) return;
    setStatus('loading');
    setError(null);
    try {
      const items = await getWatchlist(token);
      setWatchlist(items);
      setStatus('success');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load watchlist');
      setStatus('error');
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (item: WatchlistItem) => {
    if (!token || deleting) return;
    setDeleting(item.symbol);
    try {
      await deleteFromWatchlist(token, item.symbol);
      setWatchlist(prev => prev.filter(w => w.symbol !== item.symbol));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="wl">
      <header className="wl-head">
        <div className="wl-head-text">
          <h1 className="wl-title">Watchlist</h1>
          <p className="wl-sub">Track your high-conviction investment assets.</p>
        </div>
        <Button variant="primary" onClick={() => setModalOpen(true)}>+ Add Asset</Button>
      </header>

      {error && <div className="wl-banner">⚠ {error}</div>}

      {status === 'loading' ? (
        <div className="wl-empty">Loading watchlist…</div>
      ) : watchlist.length === 0 ? (
        <div className="wl-empty">
          <p className="wl-empty-title">Your watchlist is empty</p>
          <p className="wl-empty-body">Add assets to track their performance over time.</p>
          <Button variant="primary" onClick={() => setModalOpen(true)}>+ Add your first asset</Button>
        </div>
      ) : (
        <div className="wl-table-wrap">
          <table className="wl-table">
            <thead>
              <tr>
                <th className="wl-th">Asset</th>
                <th className="wl-th wl-th--right">Price</th>
                <th className="wl-th wl-th--right">24h Change</th>
                <th className="wl-th wl-th--center">7d Trend</th>
                <th className="wl-th wl-th--center">Alerts</th>
                <th className="wl-th"></th>
              </tr>
            </thead>
            <tbody>
              {watchlist.map(item => {
                const mkt = mockMarket(item.symbol);
                const positive = mkt.change >= 0;
                const cls = mkt.change > 0 ? 'positive' : mkt.change < 0 ? 'negative' : 'neutral';
                const alertOn = !!alerts[item.symbol];
                return (
                  <tr key={item.id} className="wl-tr">
                    <td className="wl-td">
                      <div className="wl-asset">
                        <span className="wl-asset-icon">{item.symbol.slice(0, 2)}</span>
                        <div className="wl-asset-text">
                          <span className="wl-asset-symbol">{item.symbol}</span>
                          <span className="wl-asset-name">{item.name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="wl-td wl-td--mono wl-td--right">{fmtPrice(mkt.price)}</td>
                    <td className={`wl-td wl-td--right wl-change ${cls}`}>
                      <span className="wl-change-chip">{fmtPct(mkt.change)}</span>
                    </td>
                    <td className="wl-td wl-td--center">
                      <Sparkline values={mkt.series} positive={positive} />
                    </td>
                    <td className="wl-td wl-td--center">
                      <button
                        className={`wl-toggle${alertOn ? ' on' : ''}`}
                        onClick={() => setAlerts(prev => ({ ...prev, [item.symbol]: !alertOn }))}
                        role="switch"
                        aria-checked={alertOn}
                        aria-label={`Toggle alerts for ${item.symbol}`}
                      >
                        <span className="wl-toggle-knob" />
                      </button>
                    </td>
                    <td className="wl-td wl-td--right">
                      <button
                        className="wl-remove"
                        onClick={() => handleDelete(item)}
                        disabled={deleting === item.symbol}
                        aria-label={`Remove ${item.symbol}`}
                      >
                        {deleting === item.symbol ? '…' : '✕'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AddAssetModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdded={load}
        addedSymbols={addedSymbols}
      />
    </div>
  );
};

export default WatchlistPage;
