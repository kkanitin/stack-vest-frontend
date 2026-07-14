import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { createPortfolio, updatePortfolio, PortfolioLimitError } from '../api/portfolios';
import type { Portfolio } from '../api/portfolios';
import { MAX_PORTFOLIOS } from '../config';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import './PortfolioFormModal.css';

interface Props {
  open: boolean;
  onClose: () => void;
  /** When set, the modal opens in edit mode for this portfolio. */
  portfolio?: Portfolio | null;
}

const PortfolioFormModal: React.FC<Props> = ({ open, onClose, portfolio }) => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const isEdit = !!portfolio;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setName('');
      setDescription('');
      setFormError(null);
      return;
    }
    if (portfolio) {
      setName(portfolio.name);
      setDescription(portfolio.description ?? '');
    }
  }, [open, portfolio]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('Session expired, please log in again.');
      const trimmedName = name.trim();
      const trimmedDesc = description.trim();
      if (isEdit && portfolio) {
        return updatePortfolio(token, portfolio.id, { name: trimmedName, description: trimmedDesc });
      }
      return createPortfolio(token, { name: trimmedName, description: trimmedDesc });
    },
    onSuccess: () => {
      toast.success(isEdit ? `${name.trim()} updated` : `${name.trim()} created`);
      onClose();
    },
    onError: (err: unknown) => {
      let friendly: string;
      if (err instanceof PortfolioLimitError) {
        friendly = `You've reached the maximum of ${MAX_PORTFOLIOS} portfolios.`;
      } else {
        const message = err instanceof Error ? err.message : 'Something went wrong';
        friendly = /unauthorized|session expired|401/i.test(message)
          ? 'Session expired, please log in again.'
          : message;
      }
      setFormError(friendly);
      toast.error(friendly);
    },
    onSettled: () => {
      // ['portfolios'] prefix-matches the list and ['portfolios','summary'] header.
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      // The single-portfolio key (read by the detail page) is NOT a prefix of
      // ['portfolios'], so refresh it explicitly after a rename/description edit.
      if (isEdit && portfolio) {
        queryClient.invalidateQueries({ queryKey: ['portfolio', portfolio.id] });
      }
    },
  });

  const nameValid = name.trim().length > 0;
  const canSubmit = nameValid && !mutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!nameValid) {
      setFormError('Portfolio name is required.');
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Portfolio' : 'New Portfolio'}</DialogTitle>
        </DialogHeader>
        <form className="pfm2-body" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="pfm2-name">Portfolio Name</Label>
            <Input
              id="pfm2-name"
              type="text"
              placeholder="e.g. Retirement 2045"
              value={name}
              onChange={e => setName(e.target.value)}
              aria-invalid={!!(formError && !nameValid)}
              autoFocus
              maxLength={120}
            />
            {formError && !nameValid && (
              <p className="text-sm text-[var(--error)]">Portfolio name is required.</p>
            )}
          </div>

        <div className="pfm2-field">
          <Label htmlFor="pfm2-desc">Description (optional)</Label>
          <textarea
            id="pfm2-desc"
            className="pfm2-textarea"
            placeholder="Briefly describe the strategy…"
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={280}
          />
        </div>

        {formError && nameValid && <div className="pfm2-error">⚠ {formError}</div>}

        <div className="pfm2-actions">
          <button type="button" className="pfm2-btn pfm2-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="pfm2-btn pfm2-btn--primary" disabled={!canSubmit}>
            {mutation.isPending
              ? isEdit ? 'Saving…' : 'Creating…'
              : isEdit ? 'Save Changes' : 'Create Portfolio'}
          </button>
        </div>
      </form>
      </DialogContent>
    </Dialog>
  );
};

export default PortfolioFormModal;
