import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { searchStocks } from '../api/stocks';
import { getWatchlist, addToWatchlist } from '../api/watchlist';
import type { StockSearchResult } from '../api/stocks';
import type { WatchlistItem } from '../api/watchlist';

const S = `
  .wl-sub{font-size:15px;color:var(--text);margin:0 0 28px;font-weight:300;}

  /* Section dividers */
  .wl-section{display:flex;align-items:center;gap:12px;margin:28px 0 14px;}
  .wl-section-label{font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--text);opacity:.5;white-space:nowrap;}
  .wl-section-rule{flex:1;height:1px;background:var(--border);}

  /* Search bar */
  .wl-search-bar{display:flex;gap:8px;align-items:stretch;}
  .wl-input{flex:1;padding:9px 14px;border:1px solid var(--border);background:var(--card);color:var(--text-h);font-family:var(--sans);font-size:14px;border-radius:8px;outline:none;transition:border-color 150ms;}
  .wl-input:focus{border-color:var(--text);}
  .wl-input::placeholder{color:var(--text);opacity:.45;}
  .wl-btn{padding:9px 20px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-family:var(--sans);font-size:13px;font-weight:600;letter-spacing:.03em;cursor:pointer;transition:all 200ms cubic-bezier(0.4,0,0.2,1);white-space:nowrap;}
  .wl-btn:hover:not(:disabled){filter:brightness(0.88);transform:translateY(-1px);box-shadow:var(--shadow);}
  .wl-btn:disabled{opacity:.55;cursor:default;}
  .wl-search-error{font-size:12px;color:var(--accent);margin-top:8px;}

  /* Search results */
  .wl-results{border:1px solid var(--border);}
  .wl-row{display:flex;align-items:center;gap:14px;padding:12px 16px;background:var(--card);border-bottom:1px solid var(--border);}
  .wl-row:last-child{border-bottom:none;}
  .wl-row-left{flex:1;min-width:0;}
  .wl-row-symbol{font-family:var(--mono);font-size:14px;font-weight:700;color:var(--text-h);letter-spacing:-.01em;}
  .wl-row-name{font-size:13px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;}
  .wl-row-meta{font-size:11px;color:var(--text);opacity:.5;margin-top:2px;font-family:var(--mono);}
  .wl-add{padding:5px 12px;font-size:12px;font-weight:600;font-family:var(--sans);letter-spacing:.03em;border:1px solid var(--border);background:transparent;color:var(--text-h);border-radius:8px;cursor:pointer;transition:all 200ms cubic-bezier(0.4,0,0.2,1);white-space:nowrap;flex-shrink:0;}
  .wl-add:hover:not(:disabled){border-color:var(--success);color:var(--success);transform:translateY(-1px);box-shadow:var(--shadow);}
  .wl-add.added{opacity:.38;cursor:default;}
  .wl-add:disabled:not(.added){opacity:.6;cursor:default;}
  .wl-row-err{font-size:11px;color:var(--accent);margin-top:3px;}

  /* Current watchlist */
  .wl-list{border:1px solid var(--border);}
  .wl-list-row{display:flex;align-items:center;gap:14px;padding:12px 16px;background:var(--card);border-bottom:1px solid var(--border);}
  .wl-list-row:last-child{border-bottom:none;}
  .wl-list-symbol{font-family:var(--mono);font-size:13px;font-weight:700;color:var(--text-h);width:60px;flex-shrink:0;}
  .wl-list-name{flex:1;font-size:13px;color:var(--text);min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .wl-list-type{font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;padding:2px 6px;background:var(--accent-bg);color:var(--accent);border:1px solid var(--accent-border);border-radius:4px;flex-shrink:0;}
  .wl-list-date{font-size:11px;color:var(--text);opacity:.4;font-family:var(--mono);flex-shrink:0;}

  @media(max-width:767px){
    .wl-search-bar{flex-direction:column;}
    .wl-btn{width:100%;}
    .wl-row{padding:10px 12px;gap:8px;}
    .wl-list-row{padding:10px 12px;gap:8px;flex-wrap:wrap;}
    .wl-list-date{width:100%;margin-top:2px;}
  }

  /* Empty / idle states */
  .wl-empty{padding:32px 20px;text-align:center;border:1px solid var(--border);color:var(--text);font-size:14px;font-weight:300;background:var(--card);}
  .wl-idle{padding:20px;text-align:center;color:var(--text);font-size:13px;opacity:.5;border:1px solid var(--border);}
  .wl-kicker{font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--text);opacity:.45;margin-bottom:16px;}
`;

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

  return (
    <>
      <style>{S}</style>

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
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default WatchlistPage;
