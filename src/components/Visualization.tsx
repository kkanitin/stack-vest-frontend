import React, { useMemo } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PortfolioValueCard from './PortfolioValueCard';
import MarketStatusCard from './MarketStatusCard';
import AllocationDonut from './AllocationDonut';
import TopHoldingsCard from './TopHoldingsCard';
import RecentActivityCard from './RecentActivityCard';
import FearGreedGauge from './FearGreedGauge';
import FearGreedSignals from './FearGreedSignals';
import { useFearGreedIndex } from '../hooks/useFearGreedIndex';
import { useAllPositions } from '../hooks/useAllPositions';
import { mergeHoldings, allocationSlices, MAX_NAMED_SLICES } from '../utils/holdings';
import './Visualization.css';

const Visualization: React.FC = () => {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] ?? 'Investor';

  const { data: positions, isLoading, isError } = useAllPositions();
  const holdings = useMemo(() => mergeHoldings(positions ?? []), [positions]);
  const slices = useMemo(() => allocationSlices(holdings, MAX_NAMED_SLICES), [holdings]);
  const pricedCount = useMemo(() => holdings.filter(h => h.valueUsd > 0).length, [holdings]);
  const noHoldings = !isLoading && !isError && holdings.length === 0;

  const { data: sentiment, isLoading: loadingSentiment, isError: sentimentError } = useFearGreedIndex();

  return (
    <div className="viz">
      <header className="viz-head">
        <div className="viz-head-text">
          <h1 className="viz-greeting">Welcome back, {firstName}.</h1>
          <p className="viz-sub">Your holdings across every portfolio, and how they are moving.</p>
        </div>
      </header>

      <div className="viz-row viz-row--hero">
        <PortfolioValueCard />
        <MarketStatusCard holdings={holdings} isLoading={isLoading} isError={isError} />
      </div>

      {isError || noHoldings ? (
        <Card className="viz-card">
          <CardContent className="viz-card--empty">
            {isError ? (
              <p className="viz-empty-text">Couldn't load your holdings. Please try again shortly.</p>
            ) : (
              <>
                <p className="viz-empty-text">
                  No holdings yet. Add positions to a portfolio to see your allocation, top holdings and movers.
                </p>
                <Link to="/dashboard/portfolios" className="viz-empty-cta">Go to portfolios</Link>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="viz-row viz-row--holdings">
          <Card className="viz-card">
            <CardHeader>
              <CardTitle className="label-caps">Allocation</CardTitle>
            </CardHeader>
            <CardContent>
              <AllocationDonut slices={slices} assetCount={pricedCount} isLoading={isLoading} />
            </CardContent>
          </Card>
          <TopHoldingsCard holdings={holdings} isLoading={isLoading} />
        </div>
      )}

      {/* Supporting context: what you did recently, and the market's mood. */}
      <div className="viz-row viz-row--support">
        <RecentActivityCard />
        <Card className="viz-card viz-card--gauge">
          <CardHeader>
            <CardTitle className="label-caps">Fear &amp; Greed Index</CardTitle>
          </CardHeader>
          <CardContent>
            <FearGreedGauge data={sentiment} isLoading={loadingSentiment} isError={sentimentError} />
          </CardContent>
        </Card>
        <Card className="viz-card viz-card--signals">
          <CardHeader>
            <CardTitle className="label-caps">What's driving this score</CardTitle>
          </CardHeader>
          <CardContent>
            <FearGreedSignals data={sentiment} isLoading={loadingSentiment} isError={sentimentError} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Visualization;
