import React, { useMemo } from 'react';
import Card from './ui/Card';
import Badge from './ui/Badge';
import { computeMarketStatus } from '../utils/marketStatus';
import type { PortfolioPosition } from '../api/portfolio';
import './Visualization.css';

const SENTIMENT_TONE = {
  bullish: 'success',
  bearish: 'error',
  mixed: 'primary',
  empty: 'neutral',
} as const satisfies Record<string, 'success' | 'error' | 'primary' | 'neutral'>;

interface MarketStatusCardProps {
  positions: PortfolioPosition[];
  isLoading: boolean;
}

const MarketStatusCard: React.FC<MarketStatusCardProps> = ({ positions, isLoading }) => {
  const status = useMemo(() => computeMarketStatus(positions), [positions]);

  return (
    <Card label="Market Status" className="viz-card">
      {isLoading ? (
        <>
          <div className="viz-skel viz-skel--title" />
          <div className="viz-skel viz-skel--body" />
        </>
      ) : (
        <>
          <div className="viz-card-title">{status.label}</div>
          <p className="viz-card-body">{status.descriptor}</p>
          {status.sentiment === 'empty' ? (
            <Badge tone="neutral">No data</Badge>
          ) : (
            <div className="viz-status-stats">
              <span className="viz-status-stat viz-status-stat--up">▲ {status.upCount} up</span>
              <span className="viz-status-stat viz-status-stat--down">▼ {status.downCount} down</span>
              <span className="viz-status-stat viz-status-stat--flat">– {status.flatCount} flat</span>
            </div>
          )}
          <Badge tone={SENTIMENT_TONE[status.sentiment]} className="viz-status-badge">
            {status.sentiment === 'empty' ? 'Awaiting data' : 'Based on your holdings'}
          </Badge>
        </>
      )}
    </Card>
  );
};

export default MarketStatusCard;
