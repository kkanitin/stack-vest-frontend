import React, { useEffect, useRef, useState } from 'react';
import { useStockSearch } from '../hooks/useStockSearch';
import './AssetPicker.css';

export interface PickedAsset {
  symbol: string;
  name: string;
}

interface Props {
  value: PickedAsset;
  onChange: (asset: PickedAsset) => void;
  id?: string;
}

/**
 * Search-to-select field. Shows the selected asset ("AAPL — Apple Inc.") until focused,
 * then becomes a search box over `GET /stocks/search`; picking a result selects it.
 */
const AssetPicker: React.FC<Props> = ({ value, onChange, id }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { results, status, error } = useStockSearch(query, open);
  const trimmed = query.trim();
  const label = `${value.symbol} — ${value.name}`;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const select = (asset: PickedAsset) => {
    onChange(asset);
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setQuery('');
      setOpen(false);
      e.currentTarget.blur();
    }
  };

  const showDropdown = open && trimmed.length > 0;
  const listId = id ? `${id}-list` : undefined;

  return (
    <div className="asp" ref={containerRef}>
      <input
        id={id}
        className="asp-input"
        type="text"
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={listId}
        autoComplete="off"
        placeholder={label}
        value={open ? query : label}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />

      {showDropdown && (
        <div className="asp-dropdown" role="listbox" id={listId}>
          {status === 'loading' || status === 'idle' ? (
            <div className="asp-state">Searching…</div>
          ) : status === 'error' ? (
            <div className="asp-state asp-state--err">⚠ {error}</div>
          ) : results.length === 0 ? (
            <div className="asp-state">No results for "{trimmed}"</div>
          ) : (
            results.map(r => (
              <button
                key={r.symbol}
                type="button"
                role="option"
                aria-selected={r.symbol === value.symbol}
                className="asp-row"
                onClick={() => select({ symbol: r.symbol, name: r.name })}
              >
                <span className="asp-row-symbol">{r.symbol}</span>
                <span className="asp-row-name">{r.name}</span>
                <span className="asp-row-meta">{r.type} · {r.region}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AssetPicker;
