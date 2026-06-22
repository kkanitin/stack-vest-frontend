import React, { useEffect, useRef, useState } from 'react';
import { useStockSearch } from '../hooks/useStockSearch';
import './TopbarSearch.css';

interface Props {
  /** Called with the selected symbol when a result is chosen. */
  onSelect: (symbol: string) => void;
}

const TopbarSearch: React.FC<Props> = ({ onSelect }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { results, status, error } = useStockSearch(query);
  const trimmed = query.trim();

  // Close the dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const handleSelect = (symbol: string) => {
    onSelect(symbol);
    setQuery('');
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setQuery('');
      setOpen(false);
      e.currentTarget.blur();
    }
  };

  const showDropdown = open && trimmed.length > 0;

  return (
    <div className="tbs" ref={containerRef}>
      <div className="tbs-field">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="tbs-icon"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          className="tbs-input"
          type="text"
          role="searchbox"
          placeholder="Search assets…"
          aria-label="Search assets"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {showDropdown && (
        <div className="tbs-dropdown" role="listbox">
          {status === 'loading' ? (
            <div className="tbs-state">Searching…</div>
          ) : status === 'error' ? (
            <div className="tbs-state tbs-state--err">⚠ {error}</div>
          ) : results.length === 0 ? (
            <div className="tbs-state">No results for "{trimmed}"</div>
          ) : (
            results.map(r => (
              <button
                key={r.symbol}
                type="button"
                role="option"
                aria-selected="false"
                className="tbs-row"
                onClick={() => handleSelect(r.symbol)}
              >
                <span className="tbs-row-symbol">{r.symbol}</span>
                <span className="tbs-row-name">{r.name}</span>
                <span className="tbs-row-meta">{r.type} · {r.region}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default TopbarSearch;
