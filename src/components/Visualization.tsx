import React from 'react';
import { useAuth } from '../context/AuthContext';
import Card from './ui/Card';
import PortfolioValueCard from './PortfolioValueCard';
import MarketStatusCard from './MarketStatusCard';
import RecentActivityCard from './RecentActivityCard';
import FearGreedGauge from './FearGreedGauge';
import FearGreedSignals from './FearGreedSignals';
import { useFearGreedIndex } from '../hooks/useFearGreedIndex';
import './Visualization.css';

const Visualization: React.FC = () => {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] ?? 'Investor';

  const { data: sentiment, isLoading: loadingSentiment, isError: sentimentError } = useFearGreedIndex();

  return (
    <div className="viz">
      <header className="viz-head">
        <div className="viz-head-text">
          <h1 className="viz-greeting">Welcome back, {firstName}.</h1>
          <p className="viz-sub">A snapshot of your portfolio and market activity.</p>
        </div>
      </header>

      <div className="viz-row viz-row--3">
        <PortfolioValueCard />
        <MarketStatusCard positions={[]} isLoading={false} />
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
    </div>
  );
};

export default Visualization;
