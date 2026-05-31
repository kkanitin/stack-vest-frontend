import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { searchStocks } from '../api/stocks';
import { addToWatchlist } from '../api/watchlist';
import { getPopularAssets } from '../api/popular';
import type { StockSearchResult } from '../api/stocks';
import type { PopularAsset } from '../api/popular';
import './AddAssetModal.css';

interface Props {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
  addedSymbols: Set<string>;
}

const AddAssetModal: React.FC<Props> = ({ open, onClose, onAdded, addedSymbols }) => {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [addError, setAddError] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<PopularAsset[]>([]);
  const [suggestionsStatus, setSuggestionsStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setSearchStatus('idle');
      setSearchError(null);
      setAddError({});
      setSuggestions([]);
      setSuggestionsStatus('idle');
      return;
    }
    setSuggestionsStatus('loading');
    getPopularAssets({ type: 'stock', limit: 10 })
      .then(data => { setSuggestions(data); setSuggestionsStatus('success'); })
      .catch(() => setSuggestionsStatus('error'));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Debounced live search
  useEffect(() => {
    if (!token) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setSearchStatus('idle');
      return;
    }
    setSearchStatus('loading');
    setSearchError(null);
    const handle = window.setTimeout(async () => {
      try {
        const data = await searchStocks(token, trimmed);
        setResults(data);
        setSearchStatus('success');
      } catch (err) {
        setSearchError(err instanceof Error ? err.message : 'Search failed');
        setSearchStatus('error');
      }
    }, 300);
    return () => window.clearTimeout(handle);
  }, [query, token]);

  const handleAdd = async (item: { symbol: string; name: string; type: string }) => {
    if (!token || adding) return;
    if (addedSymbols.has(item.symbol)) return;
    setAdding(item.symbol);
    setAddError(prev => { const n = { ...prev }; delete n[item.symbol]; return n; });
    try {
      await addToWatchlist(token, item);
      onAdded();
    } catch (err) {
      setAddError(prev => ({
        ...prev,
        [item.symbol]: err instanceof Error ? err.message : 'Failed to add',
      }));
    } finally {
      setAdding(null);
    }
  };

  if (!open) return null;

  const showingResults = query.trim().length > 0;

  return (
    <div className="aam-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="aam-panel" onClick={e => e.stopPropagation()}>
        <header className="aam-head">
          <h2 className="aam-title">Add Asset</h2>
          <button className="aam-close" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <div className="aam-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="aam-search-icon">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            className="aam-input"
            type="text"
            placeholder="Search by symbol or name…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="aam-section-label">
          {showingResults ? 'Results' : 'Suggested'}
        </div>

        <div className="aam-list">
          {showingResults ? (
            searchStatus === 'loading' ? (
              <div className="aam-state">Searching…</div>
            ) : searchStatus === 'error' ? (
              <div className="aam-state aam-state--err">⚠ {searchError}</div>
            ) : results.length === 0 ? (
              <div className="aam-state">No results for "{query}"</div>
            ) : (
              results.map(r => {
                const already = addedSymbols.has(r.symbol);
                return (
                  <div key={r.symbol} className="aam-row">
                    <div className="aam-row-text">
                      <span className="aam-row-symbol">{r.symbol}</span>
                      <span className="aam-row-name">{r.name}</span>
                      <span className="aam-row-meta">{r.type} · {r.region}</span>
                      {addError[r.symbol] && (
                        <span className="aam-row-err">⚠ {addError[r.symbol]}</span>
                      )}
                    </div>
                    <button
                      className={`aam-add${already ? ' added' : ''}`}
                      onClick={() => handleAdd({ symbol: r.symbol, name: r.name, type: r.type })}
                      disabled={already || adding === r.symbol}
                      aria-label={already ? `${r.symbol} already added` : `Add ${r.symbol}`}
                    >
                      {already ? '✓' : '+'}
                    </button>
                  </div>
                );
              })
            )
          ) : suggestionsStatus === 'loading' ? (
            <div className="aam-state">Loading suggestions…</div>
          ) : suggestionsStatus === 'error' ? (
            <div className="aam-state aam-state--err">Couldn't load suggestions</div>
          ) : (
            suggestions.map(s => {
              const already = addedSymbols.has(s.symbol);
              return (
                <div key={s.symbol} className="aam-row">
                  <div className="aam-row-text">
                    <span className="aam-row-symbol">{s.symbol}</span>
                    <span className="aam-row-name">{s.name}</span>
                    <span className="aam-row-meta">{s.type}</span>
                    {addError[s.symbol] && (
                      <span className="aam-row-err">⚠ {addError[s.symbol]}</span>
                    )}
                  </div>
                  <button
                    className={`aam-add${already ? ' added' : ''}`}
                    onClick={() => handleAdd({ symbol: s.symbol, name: s.name, type: s.type })}
                    disabled={already || adding === s.symbol}
                    aria-label={already ? `${s.symbol} already added` : `Add ${s.symbol}`}
                  >
                    {already ? '✓' : '+'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default AddAssetModal;
