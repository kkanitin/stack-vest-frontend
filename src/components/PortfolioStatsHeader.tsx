import React from 'react';
import type { PortfoliosSummary } from '../api/portfolios';
import { MAX_PORTFOLIOS } from '../config';
import './PortfolioStatsHeader.css';

function fmtMoney(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

interface PortfolioStatsHeaderProps {
  activeCount: number;
  summary: PortfoliosSummary | undefined;
  summaryLoading: boolean;
}

const PortfolioStatsHeader: React.FC<PortfolioStatsHeaderProps> = ({
  activeCount,
  summary,
  summaryLoading,
}) => {
  const score = summary ? Math.max(0, Math.min(100, Math.round(summary.diversificationScore))) : null;

  return (
    <section className="pf-stats">
      <div className="pf-stat-card">
        <span className="pf-stat-label label-caps">Total Assets Value</span>
        <div className="pf-stat-value-row">
          <span className="pf-stat-value pf-stat-value--accent">
            {summaryLoading ? '—' : summary ? fmtMoney(summary.totalValue) : '—'}
          </span>
          {summary && (
            <span className="pf-stat-delta data-md">{fmtPct(summary.changePct)}</span>
          )}
        </div>
      </div>

      <div className="pf-stat-card">
        <span className="pf-stat-label label-caps">Active Portfolios</span>
        <div className="pf-stat-value-row">
          <span className="pf-stat-value">
            {pad2(activeCount)} <span className="pf-stat-value-dim">/ {pad2(MAX_PORTFOLIOS)}</span>
          </span>
        </div>
      </div>

      <div className="pf-stat-card">
        <span className="pf-stat-label label-caps">Diversification Score</span>
        <div className="pf-stat-meter">
          <div
            className="pf-stat-meter-fill"
            style={{ width: `${score ?? 0}%` }}
          />
        </div>
        <div className="pf-stat-meter-foot">
          <span className="data-md pf-stat-meter-caption">Optimal Range</span>
          <span className="data-md pf-stat-meter-pct">{score === null ? '—' : `${score}%`}</span>
        </div>
      </div>
    </section>
  );
};

export default PortfolioStatsHeader;
