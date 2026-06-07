import React from 'react';
import Card from './ui/Card';
import Badge from './ui/Badge';
import { usePortfolioSummary } from '../hooks/usePortfolioSummary';
import './Visualization.css';

function fmtMoney(n: number): string {
  return `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

const PortfolioValueCard: React.FC = () => {
  const { data: summary, isLoading, isError, isFetching } = usePortfolioSummary();

  return (
    <Card label="Total Portfolio Value" className={`viz-card${isFetching && !isLoading ? ' viz-card--fetching' : ''}`}>
      {isLoading ? (
        <div className="viz-skel viz-skel--value" />
      ) : isError ? (
        <div className="viz-value viz-value--dim">Couldn't load summary</div>
      ) : summary ? (
        <>
          <div className="viz-value">{fmtMoney(summary.totalValue)}</div>
          <div className="viz-card-meta">
            <Badge tone={summary.changePct30d >= 0 ? 'success' : 'error'} mono>
              {fmtPct(summary.changePct30d)}
            </Badge>
            <span className="viz-card-meta-sub">
              {summary.change30d >= 0 ? '+' : '-'}{fmtMoney(summary.change30d)} · 30d
            </span>
          </div>
        </>
      ) : (
        <div className="viz-value viz-value--dim">—</div>
      )}
    </Card>
  );
};

export default PortfolioValueCard;
