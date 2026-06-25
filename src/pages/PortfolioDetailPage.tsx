import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { usePortfolio } from '../hooks/usePortfolio';
import { usePortfolioPositionsById } from '../hooks/usePortfolioPositionsById';
import { deletePortfolio } from '../api/portfolios';
import { MAX_ASSETS_PER_PORTFOLIO } from '../config';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import AllocationDonut from '../components/AllocationDonut';
import TopAssetsTable from '../components/TopAssetsTable';
import EmptyPortfolioState from '../components/EmptyPortfolioState';
import PositionFormModal from '../components/PositionFormModal';
import PortfolioFormModal from '../components/PortfolioFormModal';
import './PortfolioDetailPage.css';

const PortfolioDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: portfolio, status: portfolioStatus, error: portfolioError } = usePortfolio(id);
  const {
    data: positions,
    isLoading: loadingPositions,
    isError: positionsError,
  } = usePortfolioPositionsById(id);

  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [editSymbol, setEditSymbol] = useState<string | undefined>(undefined);
  const [editPortfolioOpen, setEditPortfolioOpen] = useState(false);

  const list = positions ?? [];
  const hasPositions = !loadingPositions && list.length > 0;
  const isEmpty = !loadingPositions && !positionsError && list.length === 0;
  const atAssetLimit = list.length >= MAX_ASSETS_PER_PORTFOLIO;

  const deleteMutation = useMutation({
    mutationFn: () => deletePortfolio(token!, id!),
    onSuccess: () => {
      toast.success('Portfolio deleted');
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      navigate('/dashboard/portfolios');
    },
    onError: err => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete portfolio');
    },
  });

  const openAddModal = () => {
    if (atAssetLimit) {
      toast.error(`This portfolio is full (max ${MAX_ASSETS_PER_PORTFOLIO} assets).`);
      return;
    }
    setEditSymbol(undefined);
    setAssetModalOpen(true);
  };
  const openEditModal = (symbol: string) => {
    setEditSymbol(symbol);
    setAssetModalOpen(true);
  };

  const handleDeletePortfolio = () => {
    if (!token || deleteMutation.isPending) return;
    const ok = window.confirm(
      `Delete "${portfolio?.name ?? 'this portfolio'}"? This permanently removes the portfolio and its assets.`
    );
    if (ok) deleteMutation.mutate();
  };

  if (portfolioStatus === 'error') {
    return (
      <div className="pfd">
        <Link to="/dashboard/portfolios" className="pfd-back">← Back to Portfolios</Link>
        <Card className="pfd-error-card">
          <p className="pfd-error-text">
            {portfolioError instanceof Error ? portfolioError.message : "Couldn't load this portfolio."}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="pfd">
      <Link to="/dashboard/portfolios" className="pfd-back">← Back to Portfolios</Link>

      <header className="pfd-head">
        <div className="pfd-head-text">
          <h1 className="pfd-title">{portfolio?.name ?? '…'}</h1>
          {portfolio?.description && <p className="pfd-sub">{portfolio.description}</p>}
        </div>
        <div className="pfd-head-actions">
          <Button variant="outline" onClick={() => setEditPortfolioOpen(true)} disabled={!portfolio}>
            Edit
          </Button>
          <Button variant="ghost" onClick={handleDeletePortfolio} disabled={!portfolio || deleteMutation.isPending}>
            Delete
          </Button>
          <Button
            variant="primary"
            onClick={openAddModal}
            disabled={atAssetLimit}
            title={atAssetLimit ? `Maximum of ${MAX_ASSETS_PER_PORTFOLIO} assets reached` : undefined}
          >
            + Add Asset
          </Button>
        </div>
      </header>

      <div className="pfd-meta">
        <span className="label-caps">Assets</span>
        <span className="data-md pfd-meta-count">
          {loadingPositions ? '—' : `${list.length} / ${MAX_ASSETS_PER_PORTFOLIO}`}
        </span>
      </div>

      {loadingPositions && (
        <div className="pfd-row">
          <Card label="Allocation" className="pfd-card pfd-card--allocation">
            <div className="viz-skel viz-skel--donut" />
          </Card>
          <Card label="Holdings" className="pfd-card pfd-card--top">
            <div className="viz-table-wrap">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="viz-skel viz-skel--row" />
              ))}
            </div>
          </Card>
        </div>
      )}

      {hasPositions && (
        <div className="pfd-row">
          <Card label="Allocation" className="pfd-card pfd-card--allocation">
            <AllocationDonut positions={list} isLoading={false} />
          </Card>
          <Card label="Holdings" className="pfd-card pfd-card--top">
            <TopAssetsTable positions={list} isLoading={false} onEdit={openEditModal} />
          </Card>
        </div>
      )}

      {isEmpty && <EmptyPortfolioState onAddPosition={openAddModal} />}

      {!loadingPositions && positionsError && (
        <Card className="pfd-error-card">
          <p className="pfd-error-text">Couldn't load this portfolio's holdings. Please try again shortly.</p>
        </Card>
      )}

      <PositionFormModal
        open={assetModalOpen}
        onClose={() => setAssetModalOpen(false)}
        editSymbol={editSymbol}
        portfolioId={id}
      />
      <PortfolioFormModal
        open={editPortfolioOpen}
        onClose={() => setEditPortfolioOpen(false)}
        portfolio={portfolio ?? null}
      />
    </div>
  );
};

export default PortfolioDetailPage;
