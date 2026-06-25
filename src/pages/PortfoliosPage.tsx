import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { usePortfolios } from '../hooks/usePortfolios';
import { usePortfoliosSummary } from '../hooks/usePortfoliosSummary';
import { deletePortfolio } from '../api/portfolios';
import type { Portfolio } from '../api/portfolios';
import { MAX_PORTFOLIOS } from '../config';
import Button from '../components/ui/Button';
import PortfolioStatsHeader from '../components/PortfolioStatsHeader';
import PortfolioCard from '../components/PortfolioCard';
import PortfolioFormModal from '../components/PortfolioFormModal';
import './PortfoliosPage.css';

const PortfoliosPage: React.FC = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: portfolios, status, error } = usePortfolios();
  const { data: summary, isLoading: summaryLoading } = usePortfoliosSummary();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Portfolio | null>(null);

  const list = portfolios ?? [];
  const atLimit = list.length >= MAX_PORTFOLIOS;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePortfolio(token!, id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['portfolios'] });
      const previous = queryClient.getQueryData<Portfolio[]>(['portfolios']);
      queryClient.setQueryData<Portfolio[]>(['portfolios'], old =>
        (old ?? []).filter(p => p.id !== id)
      );
      return { previous };
    },
    onError: (err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(['portfolios'], context.previous);
      toast.error(err instanceof Error ? err.message : 'Failed to delete portfolio');
    },
    onSuccess: () => {
      toast.success('Portfolio deleted');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      queryClient.invalidateQueries({ queryKey: ['portfolios', 'summary'] });
    },
  });

  const openCreate = () => {
    if (atLimit) {
      toast.error(`You've reached the maximum of ${MAX_PORTFOLIOS} portfolios.`);
      return;
    }
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (portfolio: Portfolio) => {
    setEditing(portfolio);
    setModalOpen(true);
  };

  const handleDelete = (portfolio: Portfolio) => {
    if (!token || deleteMutation.isPending) return;
    const ok = window.confirm(
      `Delete "${portfolio.name}"? This permanently removes the portfolio and its assets.`
    );
    if (ok) deleteMutation.mutate(portfolio.id);
  };

  return (
    <div className="pf">
      <header className="pf-head">
        <div className="pf-head-text">
          <h1 className="pf-title">Portfolios</h1>
          <p className="pf-sub">Organize your assets into focused strategies.</p>
        </div>
        <Button variant="primary" onClick={openCreate} disabled={atLimit}>
          + New Portfolio
        </Button>
      </header>

      <PortfolioStatsHeader
        activeCount={list.length}
        summary={summary}
        summaryLoading={summaryLoading}
      />

      {status === 'error' && (
        <div className="pf-banner">
          ⚠ {error instanceof Error ? error.message : 'Failed to load portfolios'}
        </div>
      )}

      {status === 'pending' ? (
        <div className="pf-grid">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="pf-card-skel" />
          ))}
        </div>
      ) : (
        <div className="pf-grid">
          {list.map(p => (
            <PortfolioCard
              key={p.id}
              portfolio={p}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}

          <button
            type="button"
            className="pf-add-card"
            onClick={openCreate}
            disabled={atLimit}
            title={atLimit ? `Maximum of ${MAX_PORTFOLIOS} portfolios reached` : undefined}
          >
            <span className="pf-add-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <span className="pf-add-label">
              {atLimit ? 'Portfolio limit reached' : 'Create New Portfolio'}
            </span>
          </button>
        </div>
      )}

      <PortfolioFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        portfolio={editing}
      />
    </div>
  );
};

export default PortfoliosPage;
