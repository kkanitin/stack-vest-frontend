import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { usePortfolio } from '../hooks/usePortfolio';
import { usePortfolioPositionsById } from '../hooks/usePortfolioPositionsById';
import { deletePortfolio, removePortfolioPosition } from '../api/portfolios';
import type { PortfolioPosition } from '../api/portfolio';
import { MAX_ASSETS_PER_PORTFOLIO } from '../config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import TopAssetsTable from '../components/TopAssetsTable';
import EmptyPortfolioState from '../components/EmptyPortfolioState';
import PositionFormModal from '../components/PositionFormModal';
import PortfolioFormModal from '../components/PortfolioFormModal';
import AnalyzePortfolioModal from '../components/AnalyzePortfolioModal';
import { fmtMoney, fmtPct, fmtCount } from '../utils/format';
import { totalNetValue, change24h } from '../utils/portfolioStats';
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
  const [analyzeOpen, setAnalyzeOpen] = useState(false);

  const list = positions ?? [];
  const hasPositions = !loadingPositions && list.length > 0;
  const isEmpty = !loadingPositions && !positionsError && list.length === 0;
  const atAssetLimit = list.length >= MAX_ASSETS_PER_PORTFOLIO;

  const netValue = totalNetValue(list);
  const perf = change24h(list);
  const slotPct = Math.min(100, (list.length / MAX_ASSETS_PER_PORTFOLIO) * 100);

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

  const removePositionMutation = useMutation({
    mutationFn: (symbol: string) => removePortfolioPosition(token!, id!, symbol),
    onMutate: async (symbol: string) => {
      const key = ['portfolio', id, 'positions'];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PortfolioPosition[]>(key);
      queryClient.setQueryData<PortfolioPosition[]>(key, old =>
        (old ?? []).filter(p => p.symbol !== symbol)
      );
      return { previous };
    },
    onError: (err, _symbol, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['portfolio', id, 'positions'], context.previous);
      }
      toast.error(err instanceof Error ? err.message : 'Failed to remove asset');
    },
    onSuccess: (_data, symbol) => toast.success(`${symbol} removed from portfolio`),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', id, 'positions'] });
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio', id] });
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

  const handleDeletePosition = (symbol: string) => {
    if (!token || removePositionMutation.isPending) return;
    if (window.confirm(`Remove ${symbol} from this portfolio?`)) {
      removePositionMutation.mutate(symbol);
    }
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
          <div className="pfd-strategy">
            <Badge variant="primary">Active Strategy</Badge>
            <h1 className="pfd-title">{portfolio?.name ?? '…'}</h1>
          </div>
          {portfolio?.description && <p className="pfd-sub">{portfolio.description}</p>}
        </div>
        <div className="pfd-head-actions">
          <Button variant="outline" onClick={() => setAnalyzeOpen(true)} disabled={!portfolio}>
            Analyze
          </Button>
          <Button variant="outline" onClick={() => setEditPortfolioOpen(true)} disabled={!portfolio}>
            Edit
          </Button>
          <Button variant="ghost" onClick={handleDeletePortfolio} disabled={!portfolio || deleteMutation.isPending}>
            Delete
          </Button>
          <Button
            onClick={openAddModal}
            disabled={atAssetLimit}
            title={atAssetLimit ? `Maximum of ${MAX_ASSETS_PER_PORTFOLIO} assets reached` : undefined}
          >
            + Add Asset
          </Button>
        </div>
      </header>

      {loadingPositions && (
        <>
          <div className="pfd-stats">
            {[0, 1, 2].map(i => (
              <Card key={i} className="pfd-stat">
                <CardContent>
                  <div className="pfd-skel pfd-skel--value" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="label-caps">Current Holdings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="pfh-wrap">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="pfd-skel pfd-skel--row" />
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {hasPositions && (
        <>
          <div className="pfd-stats">
            <Card className="pfd-stat">
              <CardHeader>
                <CardTitle className="label-caps">Total Net Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="pfd-stat-value">
                  {fmtMoney(netValue)}
                  <span className="pfd-stat-suffix">USD</span>
                </div>
              </CardContent>
            </Card>
            <Card className="pfd-stat">
              <CardHeader>
                <CardTitle className="label-caps">24h Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`pfd-stat-value ${perf.deltaUsd >= 0 ? 'pfd-perf--pos' : 'pfd-perf--neg'}`}>
                  {perf.hasData ? (
                    <>
                      {perf.deltaUsd >= 0 ? '+' : '-'}{fmtMoney(perf.deltaUsd)}
                      <span className="pfd-stat-suffix">({fmtPct(perf.pct)})</span>
                    </>
                  ) : (
                    <span className="pfh-dim">—</span>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card className="pfd-stat">
              <CardHeader>
                <CardTitle className="label-caps">Asset Allocation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="pfd-stat-value">
                  {fmtCount(list.length)}
                  <span className="pfd-stat-suffix">/ {MAX_ASSETS_PER_PORTFOLIO} Slots Used</span>
                </div>
                <div className="pfd-progress">
                  <div className="pfd-progress-fill" style={{ width: `${slotPct}%` }} />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="label-caps">Current Holdings</CardTitle>
            </CardHeader>
            <CardContent>
              <TopAssetsTable positions={list} isLoading={false} onEdit={openEditModal} onDelete={handleDeletePosition} />
            </CardContent>
          </Card>
        </>
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
      <AnalyzePortfolioModal
        open={analyzeOpen}
        onClose={() => setAnalyzeOpen(false)}
        portfolio={portfolio ?? null}
      />
    </div>
  );
};

export default PortfolioDetailPage;
