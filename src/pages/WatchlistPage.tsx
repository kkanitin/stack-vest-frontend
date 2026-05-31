import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { deleteFromWatchlist, setWatchlistAlerts } from '../api/watchlist';
import { useWatchlistQuotes } from '../hooks/useWatchlistQuotes';
import AddAssetModal from '../components/AddAssetModal';
import Button from '../components/ui/Button';
import './WatchlistPage.css';

function Sparkline({ values, positive }: { values: number[]; positive: boolean }) {
  if (values.length < 2) return <span className="wl-spark-empty" />;
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
  const { entries, watchlistStatus, watchlistError, refresh } = useWatchlistQuotes();

  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [alerts, setAlerts] = useState<Record<string, boolean>>({});

  // Sync alerts state from server values whenever the list loads or refreshes.
  useEffect(() => {
    if (watchlistStatus === 'success') {
      setAlerts(Object.fromEntries(entries.map(e => [e.item.symbol, e.item.alertsEnabled])));
    }
  }, [entries, watchlistStatus]);

  const addedSymbols = useMemo(
    () => new Set(entries.map(e => e.item.symbol)),
    [entries]
  );

  const handleDelete = async (symbol: string) => {
    if (!token || deleting) return;
    setDeleting(symbol);
    setDeleteError(null);
    try {
      await deleteFromWatchlist(token, symbol);
      refresh();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Failed to remove');
    } finally {
      setDeleting(null);
    }
  };

  const handleAlertToggle = async (symbol: string) => {
    if (!token) return;
    const next = !alerts[symbol];
    setAlerts(prev => ({ ...prev, [symbol]: next }));
    try {
      await setWatchlistAlerts(token, symbol, next);
    } catch {
      setAlerts(prev => ({ ...prev, [symbol]: !next }));
    }
  };

  const displayError = watchlistError || deleteError;

  return (
    <div className="wl">
      <header className="wl-head">
        <div className="wl-head-text">
          <h1 className="wl-title">Watchlist</h1>
          <p className="wl-sub">Track your high-conviction investment assets.</p>
        </div>
        <Button variant="primary" onClick={() => setModalOpen(true)}>+ Add Asset</Button>
      </header>

      {displayError && <div className="wl-banner">⚠ {displayError}</div>}

      {watchlistStatus === 'loading' ? (
        <div className="wl-empty">Loading watchlist…</div>
      ) : watchlistStatus === 'error' ? null : entries.length === 0 ? (
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
              {entries.map(({ item, quote, priceChange, history, status }) => {
                const change = priceChange?.['1D'] ?? null;
                const positive = change !== null ? change >= 0 : true;
                const cls = change === null ? 'neutral' : change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
                const sparkValues = history?.points.map(p => p.close) ?? [];
                const alertOn = !!alerts[item.symbol];
                const loading = status === 'loading';
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
                    <td className="wl-td wl-td--mono wl-td--right">
                      {loading || quote === null ? '—' : fmtPrice(quote.price)}
                    </td>
                    <td className={`wl-td wl-td--right wl-change ${cls}`}>
                      <span className="wl-change-chip">
                        {loading || change === null ? '—' : fmtPct(change)}
                      </span>
                    </td>
                    <td className="wl-td wl-td--center">
                      <Sparkline values={sparkValues} positive={positive} />
                    </td>
                    <td className="wl-td wl-td--center">
                      <button
                        className={`wl-toggle${alertOn ? ' on' : ''}`}
                        onClick={() => handleAlertToggle(item.symbol)}
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
                        onClick={() => handleDelete(item.symbol)}
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
        onAdded={refresh}
        addedSymbols={addedSymbols}
      />
    </div>
  );
};

export default WatchlistPage;
