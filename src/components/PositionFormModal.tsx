import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { searchStocks } from '../api/stocks';
import { addPosition, updatePosition } from '../api/portfolio';
import { usePortfolioPositions } from '../hooks/usePortfolioPositions';
import type { StockSearchResult } from '../api/stocks';
import './PositionFormModal.css';

interface Props {
  open: boolean;
  onClose: () => void;
  /** When set, the modal opens in edit mode for this symbol (shares/avgCost editable, symbol locked). */
  editSymbol?: string;
}

function fmtMoney(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const PositionFormModal: React.FC<Props> = ({ open, onClose, editSymbol }) => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { data: positions } = usePortfolioPositions();
  const isEdit = !!editSymbol;
  const editing = useMemo(
    () => (editSymbol ? positions?.find(p => p.symbol === editSymbol) ?? null : null),
    [positions, editSymbol]
  );

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ symbol: string; name: string } | null>(null);
  const [shares, setShares] = useState('');
  const [avgCost, setAvgCost] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setSearchStatus('idle');
      setSearchError(null);
      setSelected(null);
      setShares('');
      setAvgCost('');
      setFormError(null);
      return;
    }
    if (isEdit && editing) {
      setSelected({ symbol: editing.symbol, name: editing.name });
      setShares(String(editing.shares));
      setAvgCost(String(editing.avgCost));
    }
  }, [open, isEdit, editing]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Debounced symbol search (add mode only)
  useEffect(() => {
    if (!open || isEdit || !token) return;
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
  }, [query, token, open, isEdit]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['portfolio', 'positions'] });
    queryClient.invalidateQueries({ queryKey: ['portfolio', 'summary'] });
    queryClient.invalidateQueries({ queryKey: ['portfolio', 'activity'] });
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!token || !selected) throw new Error('Missing required fields');
      const sharesNum = Number(shares);
      const avgCostNum = Number(avgCost);
      if (isEdit) {
        return updatePosition(token, selected.symbol, { shares: sharesNum, avgCost: avgCostNum });
      }
      return addPosition(token, { symbol: selected.symbol, name: selected.name, shares: sharesNum, avgCost: avgCostNum });
    },
    onSuccess: () => {
      invalidate();
      onClose();
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      if (/session expired|unauthorized|401/i.test(message)) {
        setFormError('Session expired, please log in again.');
      } else if (/already hold|already exists|409/i.test(message)) {
        setFormError(`You already hold ${selected?.symbol} — edit it instead.`);
      } else if (/not found|404/i.test(message)) {
        setFormError('This position no longer exists. It may have been removed elsewhere.');
      } else {
        setFormError(message);
      }
    },
  });

  if (!open) return null;

  const sharesNum = Number(shares);
  const avgCostNum = Number(avgCost);
  const sharesValid = shares.trim() !== '' && Number.isFinite(sharesNum) && sharesNum > 0;
  const avgCostValid = avgCost.trim() !== '' && Number.isFinite(avgCostNum) && avgCostNum >= 0;
  const previewValid = sharesValid && avgCostValid;
  const canSubmit = !!selected && previewValid && !mutation.isPending;

  const handleSelect = (item: { symbol: string; name: string }) => {
    setSelected(item);
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!selected) {
      setFormError('Choose an asset to continue.');
      return;
    }
    if (!sharesValid) {
      setFormError('Shares must be greater than 0.');
      return;
    }
    if (!avgCostValid) {
      setFormError('Average cost must be 0 or greater.');
      return;
    }
    mutation.mutate();
  };

  const showingResults = !isEdit && query.trim().length > 0;

  return (
    <div className="pfm-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="pfm-panel" onClick={e => e.stopPropagation()}>
        <header className="pfm-head">
          <h2 className="pfm-title">{isEdit ? `Edit ${editSymbol}` : 'Add Position'}</h2>
          <button className="pfm-close" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <form className="pfm-body" onSubmit={handleSubmit}>
          <div className="pfm-field">
            <label className="pfm-label">Asset</label>
            {isEdit ? (
              <div className="pfm-locked">
                <span className="pfm-locked-symbol">{selected?.symbol}</span>
                <span className="pfm-locked-name">{selected?.name}</span>
                <span className="pfm-locked-tag">Locked</span>
              </div>
            ) : selected ? (
              <div className="pfm-selected">
                <span className="pfm-locked-symbol">{selected.symbol}</span>
                <span className="pfm-locked-name">{selected.name}</span>
                <button type="button" className="pfm-change" onClick={() => { setSelected(null); setQuery(''); }}>
                  Change
                </button>
              </div>
            ) : (
              <>
                <input
                  className="pfm-input"
                  type="text"
                  placeholder="Search by symbol or name…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  autoFocus
                />
                {showingResults && (
                  <div className="pfm-results">
                    {searchStatus === 'loading' ? (
                      <div className="pfm-state">Searching…</div>
                    ) : searchStatus === 'error' ? (
                      <div className="pfm-state pfm-state--err">⚠ {searchError}</div>
                    ) : results.length === 0 ? (
                      <div className="pfm-state">
                        No results for "{query}" — you can still continue with this symbol.
                        <button
                          type="button"
                          className="pfm-manual"
                          onClick={() => handleSelect({ symbol: query.trim().toUpperCase(), name: query.trim() })}
                        >
                          Use "{query.trim().toUpperCase()}"
                        </button>
                      </div>
                    ) : (
                      results.map(r => (
                        <button
                          type="button"
                          key={r.symbol}
                          className="pfm-result-row"
                          onClick={() => handleSelect({ symbol: r.symbol, name: r.name })}
                        >
                          <span className="pfm-locked-symbol">{r.symbol}</span>
                          <span className="pfm-locked-name">{r.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="pfm-row">
            <div className="pfm-field">
              <label className="pfm-label" htmlFor="pfm-shares">Shares</label>
              <input
                id="pfm-shares"
                className={`pfm-input pfm-input--mono${shares && !sharesValid ? ' pfm-input--invalid' : ''}`}
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={shares}
                onChange={e => setShares(e.target.value)}
              />
              {shares && !sharesValid && <span className="pfm-hint pfm-hint--err">Must be greater than 0.</span>}
            </div>
            <div className="pfm-field">
              <label className="pfm-label" htmlFor="pfm-avgcost">Average Cost (USD)</label>
              <input
                id="pfm-avgcost"
                className={`pfm-input pfm-input--mono${avgCost && !avgCostValid ? ' pfm-input--invalid' : ''}`}
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={avgCost}
                onChange={e => setAvgCost(e.target.value)}
              />
              {avgCost && !avgCostValid && <span className="pfm-hint pfm-hint--err">Must be 0 or greater.</span>}
            </div>
          </div>

          <div className="pfm-preview">
            <span className="pfm-preview-label">Position value</span>
            <span className="pfm-preview-value">{previewValid ? fmtMoney(sharesNum * avgCostNum) : '—'}</span>
          </div>

          {formError && <div className="pfm-error">⚠ {formError}</div>}

          <div className="pfm-actions">
            <button type="button" className="pfm-btn pfm-btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="pfm-btn pfm-btn--primary" disabled={!canSubmit}>
              {mutation.isPending ? (isEdit ? 'Saving…' : 'Adding…') : isEdit ? 'Save Changes' : 'Add Position'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PositionFormModal;
