import React, { lazy, Suspense, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { usePortfolio } from '../hooks/usePortfolio';
import { usePortfolioPositionsById } from '../hooks/usePortfolioPositionsById';
import { useClosedPositions } from '../hooks/useClosedPositions';
import { usePortfolioTransactions } from '../hooks/usePortfolioTransactions';
import { deletePortfolio, removePortfolioPosition } from '../api/portfolios';
import type { PortfolioPosition } from '../api/portfolio';
import type { Transaction, TransactionSide } from '../api/transactions';
import { MAX_ASSETS_PER_PORTFOLIO } from '../config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import TopAssetsTable from '../components/TopAssetsTable';
import EmptyPortfolioState from '../components/EmptyPortfolioState';
import TransactionFormModal from '../components/TransactionFormModal';
import HoldingHistoryDialog from '../components/HoldingHistoryDialog';
import PortfolioFormModal from '../components/PortfolioFormModal';
import { fmtMoney, fmtPct, fmtCount, fmtShares, fmtSignedMoney, changeTone } from '../utils/format';
import type { ChangeTone } from '../utils/format';
import { totalNetValue, change24h } from '../utils/portfolioStats';
import { totalUnrealisedPnl, totalRealisedPnl } from '../utils/pnlTotals';
import './PortfolioDetailPage.css';

const AnalyzePortfolioModal = lazy(() => import('../components/AnalyzePortfolioModal'));

// A flat day keeps the default text colour rather than reading as a gain.
const PERF_CLASS: Record<ChangeTone, string> = {
  positive: ' pfd-perf--pos',
  negative: ' pfd-perf--neg',
  neutral: '',
};

interface TxModalState {
  open: boolean;
  symbol?: { symbol: string; name: string };
  side?: TransactionSide;
  transaction?: Transaction;
}

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

  const {
    data: closedData,
    isLoading: loadingClosed,
    isError: closedError,
    refetch: refetchClosed,
  } = useClosedPositions(id);
  const closedList = closedData ?? [];

  const [txModal, setTxModal] = useState<TxModalState>({ open: false });
  const [historyFor, setHistoryFor] = useState<{ symbol: string; name: string } | null>(null);
  const [txFilter, setTxFilter] = useState('');
  const [editPortfolioOpen, setEditPortfolioOpen] = useState(false);
  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [analyzeMounted, setAnalyzeMounted] = useState(false);

  const list = positions ?? [];
  // Closed holdings failing to load must not read as "no holdings": keep the table area up with a notice.
  const showSkeleton = loadingPositions || (loadingClosed && list.length === 0);
  const hasPositions =
    !showSkeleton && (list.length > 0 || closedList.length > 0 || (closedError && !positionsError));
  const isEmpty =
    !showSkeleton && !positionsError && !closedError && list.length === 0 && closedList.length === 0;
  const atAssetLimit = list.length >= MAX_ASSETS_PER_PORTFOLIO;

  const netValue = totalNetValue(list);
  const perf = change24h(list);
  const unrealised = totalUnrealisedPnl(list);
  const realised = totalRealisedPnl([...list, ...closedList]);
  const symbols = Array.from(new Set([...list, ...closedList].map(p => p.symbol))).sort();
  const {
    data: txPage,
    isLoading: loadingTx,
    isError: txError,
    hasNextPage: txHasMore,
    fetchNextPage: fetchMoreTx,
    isFetchingNextPage: fetchingMoreTx,
  } = usePortfolioTransactions(id, { symbol: txFilter || undefined });
  const txs = txPage?.transactions ?? [];
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
      const closedKey = [...key, 'closed'];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PortfolioPosition[]>(key);
      const previousClosed = queryClient.getQueryData<PortfolioPosition[]>(closedKey);
      queryClient.setQueryData<PortfolioPosition[]>(key, old =>
        (old ?? []).filter(p => p.symbol !== symbol)
      );
      if (previousClosed) {
        queryClient.setQueryData<PortfolioPosition[]>(closedKey, previousClosed.filter(p => p.symbol !== symbol));
      }
      return { previous, previousClosed };
    },
    onError: (err, _symbol, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['portfolio', id, 'positions'], context.previous);
      }
      if (context?.previousClosed) {
        queryClient.setQueryData(['portfolio', id, 'positions', 'closed'], context.previousClosed);
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
    setTxModal({ open: true, side: 'buy' });
  };
  const openTradeModal = (p: PortfolioPosition, side: TransactionSide) => {
    setTxModal({ open: true, side, symbol: { symbol: p.symbol, name: p.name } });
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
    if (
      window.confirm(
        `Delete ${symbol} from this portfolio? This also deletes its entire transaction history and realised P&L. This cannot be undone.`
      )
    ) {
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
          <Button
            variant="outline"
            onClick={() => { setAnalyzeMounted(true); setAnalyzeOpen(true); }}
            disabled={!portfolio}
          >
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

      {showSkeleton && (
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
                <div className={`pfd-stat-value${PERF_CLASS[changeTone(perf.deltaUsd)]}`}>
                  {perf.hasData ? (
                    <>
                      {fmtSignedMoney(perf.deltaUsd)}
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
                <CardTitle className="label-caps">Unrealised P&amp;L</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`pfd-stat-value${PERF_CLASS[changeTone(unrealised.pnl)]}`}>
                  {fmtSignedMoney(unrealised.pnl)}
                  {unrealised.pct != null && <span className="pfd-stat-suffix">{fmtPct(unrealised.pct)} on cost</span>}
                </div>
              </CardContent>
            </Card>
            <Card className="pfd-stat">
              <CardHeader>
                <CardTitle className="label-caps">Realised P&amp;L</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingClosed || closedError ? (
                  <div className="pfd-stat-value"><span className="pfh-dim">—</span></div>
                ) : (
                  <div className={`pfd-stat-value${PERF_CLASS[changeTone(realised)]}`}>
                    {fmtSignedMoney(realised)}
                  </div>
                )}
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
              {closedError && (
                <p className="pft-state" role="alert">
                  Couldn&apos;t load closed holdings or realised P&amp;L.{' '}
                  <button type="button" className="pfh-viewall" onClick={() => refetchClosed()}>
                    Retry
                  </button>
                </p>
              )}
              <TopAssetsTable
                positions={list}
                closedPositions={closedList}
                isLoading={false}
                onBuy={p => openTradeModal(p, 'buy')}
                onSell={p => openTradeModal(p, 'sell')}
                onHistory={p => setHistoryFor({ symbol: p.symbol, name: p.name })}
                onDelete={handleDeletePosition}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pft-head">
              <CardTitle className="label-caps">Transactions</CardTitle>
              <select
                className="pft-filter"
                aria-label="Filter transactions by symbol"
                value={txFilter}
                onChange={e => setTxFilter(e.target.value)}
              >
                <option value="">All holdings</option>
                {symbols.map(sym => (
                  <option key={sym} value={sym}>{sym}</option>
                ))}
              </select>
            </CardHeader>
            <CardContent>
              {loadingTx ? (
                <div className="pfd-skel pfd-skel--row" />
              ) : txError ? (
                <p className="pft-state">Couldn&apos;t load transactions. Please try again shortly.</p>
              ) : txs.length === 0 ? (
                <p className="pft-state">No transactions yet.</p>
              ) : (
                <ul className="pft-list">
                  {txs.map(tx => (
                    <li key={tx.id} className="pft-row">
                      <Badge variant={tx.side === 'buy' ? 'success' : 'error'}>{tx.side === 'buy' ? 'BUY' : 'SELL'}</Badge>
                      <span className="pft-date">{tx.date}</span>
                      <span>
                        <span className="pft-sym">{tx.symbol}</span>
                        {tx.isOpening && <span className="pft-opening"> · Opening balance</span>}
                      </span>
                      <span className="pft-detail">
                        {fmtShares(tx.quantity)} @ {fmtMoney(tx.price)}
                        {tx.side === 'sell' && tx.realisedPnl != null && (
                          <span className={`pfh-mv-change ${changeTone(tx.realisedPnl)}`}> · {fmtSignedMoney(tx.realisedPnl)}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {txHasMore && !txError && (
                <div className="pft-more">
                  <button
                    type="button"
                    className="pfh-viewall"
                    disabled={fetchingMoreTx}
                    onClick={() => fetchMoreTx()}
                  >
                    {fetchingMoreTx ? 'Loading…' : 'Show more'}
                  </button>
                </div>
              )}
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

      <TransactionFormModal
        open={txModal.open}
        onClose={() => setTxModal(m => ({ ...m, open: false }))}
        portfolioId={id!}
        symbol={txModal.symbol}
        initialSide={txModal.side}
        transaction={txModal.transaction}
      />
      {historyFor && (
        <HoldingHistoryDialog
          // Hidden (not closed) while an edit is open on top of it, so it returns afterwards.
          open={!txModal.open}
          onClose={() => setHistoryFor(null)}
          portfolioId={id!}
          symbol={historyFor.symbol}
          name={historyFor.name}
          onEdit={tx => setTxModal({ open: true, transaction: tx })}
        />
      )}
      <PortfolioFormModal
        open={editPortfolioOpen}
        onClose={() => setEditPortfolioOpen(false)}
        portfolio={portfolio ?? null}
      />
      {analyzeMounted && (
        <Suspense fallback={null}>
          <AnalyzePortfolioModal
            open={analyzeOpen}
            onClose={() => setAnalyzeOpen(false)}
            portfolio={portfolio ?? null}
          />
        </Suspense>
      )}
    </div>
  );
};

export default PortfolioDetailPage;
