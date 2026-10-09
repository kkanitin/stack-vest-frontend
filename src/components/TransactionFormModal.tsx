import React, { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { useStockSearch } from '../hooks/useStockSearch';
import { useTransactionMutations } from '../hooks/useTransactionMutations';
import type { Transaction, TransactionSide } from '../api/transactions';
import { fmtMoney } from '../utils/format';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import './TransactionFormModal.css';

export interface TransactionFormModalProps {
  open: boolean;
  onClose: () => void;
  /** The portfolio whose ledger the modal writes to. */
  portfolioId: string;
  /** Buy/Sell on an existing holding: the asset is fixed. Omit to search for a new asset. */
  symbol?: { symbol: string; name: string };
  /** Side preselected for a new transaction. */
  initialSide?: TransactionSide;
  /** When set, the modal edits this ledger row (its symbol stays locked). */
  transaction?: Transaction;
}

/** Today as `YYYY-MM-DD`, capped at the UTC date the server validates against. */
function todayISO(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const local = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const utc = now.toISOString().slice(0, 10);
  return local < utc ? local : utc;
}

/** The latest date the server accepts (UTC today). */
function maxDate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

const TransactionFormModal: React.FC<TransactionFormModalProps> = ({ open, onClose, ...rest }) => {
  // While a save is in flight the modal cannot be dismissed (Esc / overlay / X), so the
  // outcome (inline error or success toast) is never dropped by an unmounting form.
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={o => { if (!o && !busy) onClose(); }}>
      <DialogContent>
        {/* Mounted only while open, so every opening starts from fresh form state. */}
        <TransactionForm onClose={onClose} onBusyChange={setBusy} {...rest} />
      </DialogContent>
    </Dialog>
  );
};

type FormProps = Omit<TransactionFormModalProps, 'open'> & { onBusyChange: (busy: boolean) => void };

const TransactionForm: React.FC<FormProps> = ({ onClose, onBusyChange, portfolioId, symbol, initialSide, transaction }) => {
  const toast = useToast();
  const { create, update } = useTransactionMutations(portfolioId);
  const isEdit = !!transaction;
  const locked = isEdit || !!symbol;

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<{ symbol: string; name: string } | null>(
    transaction ? { symbol: transaction.symbol, name: transaction.name } : symbol ?? null
  );
  const [side, setSide] = useState<TransactionSide>(transaction?.side ?? initialSide ?? 'buy');
  const [date, setDate] = useState(transaction?.date ?? todayISO());
  const [quantity, setQuantity] = useState(transaction ? String(transaction.quantity) : '');
  const [price, setPrice] = useState(transaction ? String(transaction.price) : '');
  const [fee, setFee] = useState(transaction && transaction.fee ? String(transaction.fee) : '');
  const [note, setNote] = useState(transaction?.note ?? '');
  const [formError, setFormError] = useState<string | null>(null);

  const { results, status: searchStatus, error: searchError } = useStockSearch(query, !locked);

  const qtyNum = Number(quantity);
  const priceNum = Number(price);
  const feeNum = fee.trim() === '' ? 0 : Number(fee);
  const qtyValid = quantity.trim() !== '' && Number.isFinite(qtyNum) && qtyNum > 0;
  const priceValid = price.trim() !== '' && Number.isFinite(priceNum) && priceNum >= 0;
  const feeValid = Number.isFinite(feeNum) && feeNum >= 0;
  const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= maxDate();
  const pending = create.isPending || update.isPending;
  useEffect(() => {
    onBusyChange(pending);
    return () => onBusyChange(false);
  }, [pending, onBusyChange]);
  const canSubmit = !!selected && qtyValid && priceValid && feeValid && dateValid && !pending;
  const totalValid = qtyValid && priceValid && feeValid;
  // Buys add the fee to cost; sells net it off the proceeds.
  const total = totalValid ? qtyNum * priceNum + (side === 'buy' ? feeNum : -feeNum) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!selected) return setFormError('Choose an asset to continue.');
    if (!qtyValid) return setFormError('Quantity must be greater than 0.');
    if (!priceValid) return setFormError('Price must be 0 or greater.');
    if (!feeValid) return setFormError('Fee must be 0 or greater.');
    if (!dateValid) return setFormError('Date cannot be in the future.');

    const onSuccess = () => {
      toast.success(
        isEdit ? `${selected.symbol} transaction updated` : `${side === 'buy' ? 'Bought' : 'Sold'} ${selected.symbol}`
      );
      onClose();
    };
    const onError = (err: unknown) => {
      // The server's message already says what is wrong (e.g. which sell would oversell).
      setFormError(err instanceof Error ? err.message : 'Something went wrong');
    };

    const trimmedNote = note.trim();
    if (transaction) {
      update.mutate(
        {
          txId: transaction.id,
          body: { side, quantity: qtyNum, price: priceNum, fee: feeNum, note: trimmedNote, date },
        },
        { onSuccess, onError }
      );
    } else {
      create.mutate(
        {
          symbol: selected.symbol,
          name: selected.name,
          side,
          quantity: qtyNum,
          price: priceNum,
          fee: feeNum,
          ...(trimmedNote ? { note: trimmedNote } : {}),
          date,
        },
        { onSuccess, onError }
      );
    }
  };

  const title = isEdit
    ? `Edit ${transaction.symbol} transaction`
    : symbol
      ? `${side === 'buy' ? 'Buy' : 'Sell'} ${symbol.symbol}`
      : 'Add Asset';
  const submitLabel = pending ? 'Saving…' : isEdit ? 'Save Changes' : side === 'buy' ? 'Record Buy' : 'Record Sell';
  const showingResults = !locked && query.trim().length > 0;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          {isEdit ? 'Edit this ledger entry.' : 'Record a buy or sell in this portfolio.'}
        </DialogDescription>
      </DialogHeader>
      <form className="tfm-body" onSubmit={handleSubmit}>
        <div className="tfm-field">
          <span className="tfm-label">Asset</span>
          {locked ? (
            <div className="tfm-locked">
              <span className="tfm-locked-symbol">{selected?.symbol}</span>
              <span className="tfm-locked-name">{selected?.name}</span>
              <span className="tfm-locked-tag">Locked</span>
            </div>
          ) : selected ? (
            <div className="tfm-selected">
              <span className="tfm-locked-symbol">{selected.symbol}</span>
              <span className="tfm-locked-name">{selected.name}</span>
              <button type="button" className="tfm-change" onClick={() => { setSelected(null); setQuery(''); }}>
                Change
              </button>
            </div>
          ) : (
            <>
              <input
                className="tfm-input"
                type="text"
                aria-label="Search assets"
                placeholder="Search by symbol or name…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoFocus
              />
              {showingResults && (
                <div className="tfm-results">
                  {searchStatus === 'loading' ? (
                    <div className="tfm-state">Searching…</div>
                  ) : searchStatus === 'error' ? (
                    <div className="tfm-state tfm-state--err">⚠ {searchError}</div>
                  ) : results.length === 0 ? (
                    <div className="tfm-state">
                      No results for "{query}" — you can still continue with this symbol.
                      <button
                        type="button"
                        className="tfm-manual"
                        onClick={() => setSelected({ symbol: query.trim().toUpperCase(), name: query.trim() })}
                      >
                        Use "{query.trim().toUpperCase()}"
                      </button>
                    </div>
                  ) : (
                    results.map(r => (
                      <button
                        type="button"
                        key={r.symbol}
                        className="tfm-result-row"
                        onClick={() => { setSelected({ symbol: r.symbol, name: r.name }); setFormError(null); }}
                      >
                        <span className="tfm-locked-symbol">{r.symbol}</span>
                        <span className="tfm-locked-name">{r.name}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="tfm-side" role="group" aria-label="Transaction type">
          {(['buy', 'sell'] as const).map(s => (
            <button
              key={s}
              type="button"
              className={`tfm-side-btn tfm-side-btn--${s}`}
              aria-pressed={side === s}
              onClick={() => { setSide(s); setFormError(null); }}
            >
              {s === 'buy' ? 'Buy' : 'Sell'}
            </button>
          ))}
        </div>

        <div className="tfm-row">
          <div className="grid gap-2">
            <Label htmlFor="tfm-date">Date</Label>
            <Input
              id="tfm-date"
              className="font-mono"
              type="date"
              max={maxDate()}
              value={date}
              onChange={e => setDate(e.target.value)}
              aria-invalid={!dateValid}
              aria-describedby={!dateValid ? 'tfm-date-err' : undefined}
            />
            {!dateValid && <p id="tfm-date-err" className="text-sm text-[var(--error)]">Pick a date that is not in the future.</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tfm-quantity">Quantity</Label>
            <Input
              id="tfm-quantity"
              className="font-mono"
              type="number"
              min="0"
              step="any"
              placeholder="0.00"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              aria-invalid={!!(quantity && !qtyValid)}
              aria-describedby={quantity && !qtyValid ? 'tfm-quantity-err' : undefined}
            />
            {quantity && !qtyValid && <p id="tfm-quantity-err" className="text-sm text-[var(--error)]">Must be greater than 0.</p>}
          </div>
        </div>

        <div className="tfm-row">
          <div className="grid gap-2">
            <Label htmlFor="tfm-price">Price per share (USD)</Label>
            <Input
              id="tfm-price"
              className="font-mono"
              type="number"
              min="0"
              step="any"
              placeholder="0.00"
              value={price}
              onChange={e => setPrice(e.target.value)}
              aria-invalid={!!(price && !priceValid)}
              aria-describedby={price && !priceValid ? 'tfm-price-err' : undefined}
            />
            {price && !priceValid && <p id="tfm-price-err" className="text-sm text-[var(--error)]">Must be 0 or greater.</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tfm-fee">Fee (USD, optional)</Label>
            <Input
              id="tfm-fee"
              className="font-mono"
              type="number"
              min="0"
              step="any"
              placeholder="0.00"
              value={fee}
              onChange={e => setFee(e.target.value)}
              aria-invalid={!feeValid}
              aria-describedby={!feeValid ? 'tfm-fee-err' : undefined}
            />
            {!feeValid && <p id="tfm-fee-err" className="text-sm text-[var(--error)]">Must be 0 or greater.</p>}
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="tfm-note">Note (optional)</Label>
          <Input
            id="tfm-note"
            type="text"
            maxLength={200}
            placeholder="e.g. Quarterly top-up"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>

        <div className="tfm-preview">
          <span className="tfm-preview-label">{side === 'buy' ? 'Total cost (fee included)' : 'Net proceeds (after fee)'}</span>
          <span className="tfm-preview-value">{totalValid ? fmtMoney(total) : '—'}</span>
        </div>

        {formError && <div className="tfm-error" role="alert">⚠ {formError}</div>}

        <div className="tfm-actions">
          <button type="button" className="tfm-btn tfm-btn--ghost" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button type="submit" className="tfm-btn tfm-btn--primary" disabled={!canSubmit}>
            {submitLabel}
          </button>
        </div>
      </form>
    </>
  );
};

export default TransactionFormModal;
