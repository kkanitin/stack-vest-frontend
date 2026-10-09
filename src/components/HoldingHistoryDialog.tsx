import React from 'react';
import { useToast } from '../context/ToastContext';
import { useHoldingTransactions } from '../hooks/useHoldingTransactions';
import { useTransactionMutations } from '../hooks/useTransactionMutations';
import type { Transaction } from '../api/transactions';
import { fmtMoney, fmtShares, fmtSignedMoney, changeTone } from '../utils/format';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import './HoldingHistoryDialog.css';

interface Props {
  open: boolean;
  onClose: () => void;
  portfolioId: string;
  symbol: string;
  name?: string;
  onEdit: (tx: Transaction) => void;
}

const HoldingHistoryDialog: React.FC<Props> = ({ open, onClose, portfolioId, symbol, name, onEdit }) => {
  const toast = useToast();
  const { data, isLoading, isError, error, hasNextPage, fetchNextPage, isFetchingNextPage } = useHoldingTransactions(
    portfolioId,
    open ? symbol : undefined
  );
  const { remove } = useTransactionMutations(portfolioId);

  const handleDelete = (tx: Transaction) => {
    if (remove.isPending) return;
    const what = tx.isOpening ? 'the opening balance' : `this ${tx.side} of ${fmtShares(tx.quantity)} ${tx.symbol}`;
    if (!window.confirm(`Delete ${what} dated ${tx.date}? Your share count and P&L will be recalculated.`)) return;
    remove.mutate(tx.id, {
      onSuccess: () => toast.success('Transaction deleted'),
      // A 409 here means removing this row would leave a later sell short of shares.
      onError: err => toast.error(err instanceof Error ? err.message : 'Failed to delete transaction'),
    });
  };

  return (
    // Not dismissable mid-delete, so the outcome toast is not lost with the dialog.
    <Dialog open={open} onOpenChange={o => { if (!o && !remove.isPending) onClose(); }}>
      <DialogContent className="hhd-content">
        <DialogHeader>
          <DialogTitle>{symbol} history</DialogTitle>
          <DialogDescription>{name && name !== symbol ? `${name} · ` : ''}Newest first</DialogDescription>
        </DialogHeader>
        <div className="hhd-body">
          {isLoading ? (
            <div className="hhd-state">Loading history…</div>
          ) : isError ? (
            <div className="hhd-state hhd-state--err" role="alert">
              ⚠ {error instanceof Error ? error.message : 'Failed to load history'}
            </div>
          ) : !data || data.length === 0 ? (
            <div className="hhd-state">No transactions yet.</div>
          ) : (
            <ul className="hhd-list">
              {data.map(tx => (
                <li key={tx.id} className="hhd-row">
                  <div className="hhd-main">
                    <div className="hhd-line">
                      <Badge variant={tx.side === 'buy' ? 'success' : 'error'}>{tx.side === 'buy' ? 'BUY' : 'SELL'}</Badge>
                      <span className="hhd-date">{tx.date}</span>
                      {tx.isOpening && <span className="hhd-opening">Opening balance</span>}
                    </div>
                    <div className="hhd-detail">
                      {fmtShares(tx.quantity)} @ {fmtMoney(tx.price)}
                      {tx.fee > 0 && <span> · fee {fmtMoney(tx.fee)}</span>}
                    </div>
                    {tx.note && <div className="hhd-note">{tx.note}</div>}
                  </div>
                  <div className="hhd-side">
                    <div className="hhd-running">{fmtShares(tx.runningShares)} held</div>
                    {tx.side === 'sell' && tx.realisedPnl != null && (
                      <div className={`hhd-pnl hhd-pnl--${changeTone(tx.realisedPnl)}`}>
                        {fmtSignedMoney(tx.realisedPnl)} realised
                      </div>
                    )}
                    <div className="hhd-actions">
                      <button
                        type="button"
                        className="hhd-btn"
                        onClick={() => onEdit(tx)}
                        aria-label={`Edit ${tx.side} on ${tx.date}`}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="hhd-btn hhd-btn--danger"
                        onClick={() => handleDelete(tx)}
                        disabled={remove.isPending}
                        aria-label={`Delete ${tx.side} on ${tx.date}`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {hasNextPage && !isError && (
            <div className="hhd-state">
              <button type="button" className="hhd-btn" disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>
                {isFetchingNextPage ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HoldingHistoryDialog;
