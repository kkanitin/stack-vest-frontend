import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Card from './ui/Card';
import Button from './ui/Button';
import PortfolioValueCard from './PortfolioValueCard';
import MarketStatusCard from './MarketStatusCard';
import RecentActivityCard from './RecentActivityCard';
import AllocationDonut from './AllocationDonut';
import TopAssetsTable from './TopAssetsTable';
import EmptyPortfolioState from './EmptyPortfolioState';
import PositionFormModal from './PositionFormModal';
import FearGreedGauge from './FearGreedGauge';
import FearGreedSignals from './FearGreedSignals';
import { usePortfolioPositions } from '../hooks/usePortfolioPositions';
import { useFearGreedIndex } from '../hooks/useFearGreedIndex';
import './Visualization.css';

const Visualization: React.FC = () => {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] ?? 'Investor';

  const { data: positions, isLoading: loadingPositions, isError: positionsError } = usePortfolioPositions();
  const { data: sentiment, isLoading: loadingSentiment, isError: sentimentError } = useFearGreedIndex();

  const [modalOpen, setModalOpen] = useState(false);
  const [editSymbol, setEditSymbol] = useState<string | undefined>(undefined);

  const openAddModal = () => {
    setEditSymbol(undefined);
    setModalOpen(true);
  };
  const openEditModal = (symbol: string) => {
    setEditSymbol(symbol);
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);

  const list = positions ?? [];
  const hasPositions = !loadingPositions && list.length > 0;
  const isEmpty = !loadingPositions && !positionsError && list.length === 0;

  return (
    <div className="viz">
      <header className="viz-head">
        <div className="viz-head-text">
          <h1 className="viz-greeting">Welcome back, {firstName}.</h1>
          <p className="viz-sub">A snapshot of your portfolio and market activity.</p>
        </div>
        <Button variant="primary" onClick={openAddModal} className="viz-add-btn">
          + Add Position
        </Button>
      </header>

      <div className="viz-row viz-row--3">
        <PortfolioValueCard />
        <MarketStatusCard positions={list} isLoading={loadingPositions} />
        <RecentActivityCard />
      </div>

      <div className="viz-row viz-row--sentiment">
        <Card label="Fear & Greed Index" className="viz-card viz-card--gauge">
          <FearGreedGauge data={sentiment} isLoading={loadingSentiment} isError={sentimentError} />
        </Card>
        <Card label="What's driving this score" className="viz-card viz-card--signals">
          <FearGreedSignals data={sentiment} isLoading={loadingSentiment} isError={sentimentError} />
        </Card>
      </div>

      {loadingPositions && (
        <div className="viz-row viz-row--allocation">
          <Card label="Allocation" className="viz-card viz-card--allocation">
            <div className="viz-skel viz-skel--donut" />
          </Card>
          <Card label="Top Assets" className="viz-card viz-card--top">
            <div className="viz-table-wrap">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="viz-skel viz-skel--row" />
              ))}
            </div>
          </Card>
        </div>
      )}

      {hasPositions && (
        <div className="viz-row viz-row--allocation">
          <Card label="Allocation" className="viz-card viz-card--allocation">
            <AllocationDonut positions={list} isLoading={false} />
          </Card>
          <Card label="Top Assets" className="viz-card viz-card--top">
            <TopAssetsTable positions={list} isLoading={false} onEdit={openEditModal} />
          </Card>
        </div>
      )}

      {isEmpty && <EmptyPortfolioState onAddPosition={openAddModal} />}

      {!loadingPositions && positionsError && (
        <Card label="Portfolio" className="viz-card viz-card--empty">
          <p className="viz-empty-text">Couldn't load your positions. Please try again shortly.</p>
        </Card>
      )}

      <PositionFormModal open={modalOpen} onClose={closeModal} editSymbol={editSymbol} />
    </div>
  );
};

export default Visualization;
