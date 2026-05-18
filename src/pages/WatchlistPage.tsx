import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { searchStocks } from '../api/stocks';
import { getWatchlist, addToWatchlist, deleteFromWatchlist } from '../api/watchlist';
import type { StockSearchResult } from '../api/stocks';
import type { WatchlistItem } from '../api/watchlist';
import './WatchlistPage.css';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const WatchlistPage: React.FC = () => {
  const { token } = useAuth();

  const [keywords, setKeywords] = useState('');
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [searchError, setSearchError] = useState<string | null>(null);

  const [adding, setAdding] = useState<string | null>(null);
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const [added, setAdded] = useState<Set<string>>(new Set());

  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [wlStatus, setWlStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});

  const loadWatchlist = async () => {
    if (!token) return;
    setWlStatus('loading');
    try {
      const items = await getWatchlist(token);
      setWatchlist(items);
      setAdded(new Set(items.map(i => i.symbol)));
      setWlStatus('success');
    } catch {
      setWlStatus('error');
    }
  };

  useEffect(() => { loadWatchlist(); }, [token]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !keywords.trim()) return;
    setSearchStatus('loading');
    setSearchError(null);
    setResults([]);
    try {
      const data = await searchStocks(token, keywords.trim());
      setResults(data);
      setSearchStatus('success');
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed');
      setSearchStatus('error');
    }
  };

  const handleAdd = async (result: StockSearchResult) => {
    if (!token || adding || added.has(result.symbol)) return;
    setAdding(result.symbol);
    setAddErrors(prev => { const n = { ...prev }; delete n[result.symbol]; return n; });
    try {
      await addToWatchlist(token, { symbol: result.symbol, name: result.name, type: result.type });
      setAdded(prev => new Set([...prev, result.symbol]));
      await loadWatchlist();
    } catch (err) {
      setAddErrors(prev => ({
        ...prev,
        [result.symbol]: err instanceof Error ? err.message : 'Failed to add',
      }));
    } finally {
      setAdding(null);
    }
  };

  const handleDelete = async (item: WatchlistItem) => {
    if (!token || deleting) return;
    setDeleting(item.symbol);
    setDeleteErrors(prev => { const n = { ...prev }; delete n[item.symbol]; return n; });
    try {
      await deleteFromWatchlist(token, item.symbol);
      setWatchlist(prev => prev.filter(w => w.symbol !== item.symbol));
      setAdded(prev => { const n = new Set(prev); n.delete(item.symbol); return n; });
    } catch (err) {
      setDeleteErrors(prev => ({
        ...prev,
        [item.symbol]: err instanceof Error ? err.message : 'Failed to remove',
      }));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <div className="wl-kicker">Watchlist</div>
      <h1>Manage Watchlist</h1>
      <p className="wl-sub">Search for stocks and ETFs to track, and manage your watchlist.</p>

      {/* Search */}
      <form onSubmit={handleSearch} className="wl-search-bar">
        <input
          className="wl-input"
          type="text"
          placeholder="Search stocks or ETFs… e.g. Apple, AAPL"
          value={keywords}
          onChange={e => setKeywords(e.target.value)}
        />
        <button className="wl-btn" type="submit" disabled={searchStatus === 'loading'}>
          {searchStatus === 'loading' ? 'Searching…' : 'Search'}
        </button>
      </form>
      {searchStatus === 'error' && searchError && (
        <div className="wl-search-error">⚠ {searchError}</div>
      )}

      {/* Search Results */}
      {searchStatus === 'success' && (
        <>
          <div className="wl-section">
            <span className="wl-section-label">Results</span>
            <span className="wl-section-rule" />
          </div>
          {results.length === 0 ? (
            <div className="wl-idle">No results found for "{keywords}"</div>
          ) : (
            <div className="wl-results">
              {results.map(r => {
                const isAdded = added.has(r.symbol);
                const isAdding = adding === r.symbol;
                return (
                  <div key={r.symbol} className="wl-row">
                    <div className="wl-row-left">
                      <div className="wl-row-symbol">{r.symbol}</div>
                      <div className="wl-row-name">{r.name}</div>
                      <div className="wl-row-meta">{r.type} · {r.region} · {r.currency}</div>
                      {addErrors[r.symbol] && (
                        <div className="wl-row-err">⚠ {addErrors[r.symbol]}</div>
                      )}
                    </div>
                    <button
                      className={`wl-add${isAdded ? ' added' : ''}`}
                      onClick={() => handleAdd(r)}
                      disabled={isAdded || isAdding || adding !== null}
                    >
                      {isAdding ? 'Adding…' : isAdded ? 'Added ✓' : '+ Add'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Current Watchlist */}
      <div className="wl-section">
        <span className="wl-section-label">Your Watchlist</span>
        <span className="wl-section-rule" />
      </div>

      {wlStatus === 'loading' ? (
        <div className="wl-idle">Loading…</div>
      ) : watchlist.length === 0 ? (
        <div className="wl-empty">Your watchlist is empty. Search above to add stocks.</div>
      ) : (
        <div className="wl-list">
          {watchlist.map(item => (
            <div key={item.id} className="wl-list-row">
              <span className="wl-list-symbol">{item.symbol}</span>
              <span className="wl-list-name">{item.name}</span>
              <span className="wl-list-type">{item.type}</span>
              <span className="wl-list-date">Added {formatDate(item.addedAt)}</span>
              <button
                className="wl-remove"
                onClick={() => handleDelete(item)}
                disabled={deleting !== null}
              >
                {deleting === item.symbol ? 'Removing…' : 'Remove'}
              </button>
              {deleteErrors[item.symbol] && (
                <span className="wl-list-err">⚠ {deleteErrors[item.symbol]}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default WatchlistPage;
