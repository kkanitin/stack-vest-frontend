import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import type { PortfolioPosition } from '../api/portfolio';
import {
  addPortfolioPosition,
  updatePortfolioPosition,
} from '../api/portfolios';
import { useToast } from '../context/ToastContext';
import { useStockSearch } from '../hooks/useStockSearch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import './PositionFormModal.css';

interface Props {
  open: boolean;
  onClose: () => void;
  /** When set, the modal opens in edit mode for this symbol (shares/avgCost editable, symbol locked). */
  editSymbol?: string;
  /** The portfolio whose scoped /portfolios/{id}/positions endpoints the modal operates on. */
  portfolioId: string;
}

function fmtMoney(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const PositionFormModal: React.FC<Props> = ({ open, onClose, editSymbol, portfolioId }) => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const isEdit = !!editSymbol;

  // Query key for this portfolio's positions list.
  const positionsKey = useMemo<QueryKey>(
    () => ['portfolio', portfolioId, 'positions'],
    [portfolioId]
  );

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<{ symbol: string; name: string } | null>(null);
  const [shares, setShares] = useState('');
  const [avgCost, setAvgCost] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Debounced symbol search (add mode only, while open)
  const { results, status: searchStatus, error: searchError } = useStockSearch(
    query,
    open && !isEdit
  );

  useEffect(() => {
    if (!open) {
      setQuery('');
      setSelected(null);
      setShares('');
      setAvgCost('');
      setFormError(null);
      return;
    }
    if (isEdit && editSymbol) {
      const positions = queryClient.getQueryData<PortfolioPosition[]>(positionsKey);
      const editing = positions?.find(p => p.symbol === editSymbol);
      if (editing) {
        setSelected({ symbol: editing.symbol, name: editing.name });
        setShares(String(editing.shares));
        setAvgCost(String(editing.avgCost));
      } else {
        setSelected({ symbol: editSymbol, name: editSymbol });
      }
    }
  }, [open, isEdit, editSymbol, positionsKey, queryClient]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: positionsKey });
    // The card/list value + assetCount and the header stats derive from holdings.
    queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    queryClient.invalidateQueries({ queryKey: ['portfolio', portfolioId] });
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!token || !selected) throw new Error('Missing required fields');
      const sharesNum = Number(shares);
      const avgCostNum = Number(avgCost);
      if (isEdit) {
        return updatePortfolioPosition(token, portfolioId, selected.symbol, { shares: sharesNum, avgCost: avgCostNum });
      }
      const body = { symbol: selected.symbol, name: selected.name, shares: sharesNum, avgCost: avgCostNum };
      return addPortfolioPosition(token, portfolioId, body);
    },
    // Optimistic update for edits only — the server computes valueUsd/change24h on add.
    onMutate: async () => {
      if (!isEdit || !selected) return;
      await queryClient.cancelQueries({ queryKey: positionsKey });
      const previous = queryClient.getQueryData<PortfolioPosition[]>(positionsKey);
      const sharesNum = Number(shares);
      const avgCostNum = Number(avgCost);
      queryClient.setQueryData<PortfolioPosition[]>(positionsKey, old =>
        (old ?? []).map(p =>
          p.symbol === selected.symbol ? { ...p, shares: sharesNum, avgCost: avgCostNum } : p
        )
      );
      return { previous };
    },
    onSuccess: () => {
      toast.success(isEdit ? `${selected?.symbol} updated` : `${selected?.symbol} added to portfolio`);
      onClose();
    },
    onError: (err: unknown, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(positionsKey, context.previous);
      }
      const message = err instanceof Error ? err.message : 'Something went wrong';
      let friendly = message;
      if (/session expired|unauthorized|401/i.test(message)) {
        friendly = 'Session expired, please log in again.';
      } else if (/already hold|already exists|409/i.test(message)) {
        friendly = `You already hold ${selected?.symbol} — edit it instead.`;
      } else if (/not found|404/i.test(message)) {
        friendly = 'This position no longer exists. It may have been removed elsewhere.';
      }
      setFormError(friendly);
      toast.error(friendly);
    },
    onSettled: () => {
      invalidate();
    },
  });

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
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${editSymbol}` : 'Add Position'}</DialogTitle>
        </DialogHeader>
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
            <div className="grid gap-2">
              <Label htmlFor="pfm-shares">Shares</Label>
              <Input
                id="pfm-shares"
                className="font-mono"
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={shares}
                onChange={e => setShares(e.target.value)}
                aria-invalid={!!(shares && !sharesValid)}
              />
              {shares && !sharesValid && (
                <p className="text-sm text-[var(--error)]">Must be greater than 0.</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pfm-avgcost">Average Cost (USD)</Label>
              <Input
                id="pfm-avgcost"
                className="font-mono"
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={avgCost}
                onChange={e => setAvgCost(e.target.value)}
                aria-invalid={!!(avgCost && !avgCostValid)}
              />
              {avgCost && !avgCostValid && (
                <p className="text-sm text-[var(--error)]">Must be 0 or greater.</p>
              )}
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
      </DialogContent>
    </Dialog>
  );
};

export default PositionFormModal;
