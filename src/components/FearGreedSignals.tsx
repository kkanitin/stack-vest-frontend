import React from 'react';
import type { FearGreedIndex } from '../api/sentiment';
import './FearGreedGauge.css';

interface FearGreedSignalsProps {
  data?: FearGreedIndex;
  isLoading: boolean;
  isError: boolean;
}

const FearGreedSignals: React.FC<FearGreedSignalsProps> = ({ data, isLoading, isError }) => {
  if (isLoading) {
    return (
      <div className="viz-table-wrap">
        {[0, 1, 2].map(i => (
          <div key={i} className="viz-skel viz-skel--row" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return <p className="viz-empty-text">We can't show what's driving the score right now.</p>;
  }

  const { signals } = data;
  const changeSign = signals.indexChangePercent > 0 ? '+' : '';
  const rows = [
    {
      label: 'VIX (volatility index)',
      value: signals.vix.toFixed(1),
      weight: '~50% weight',
    },
    {
      label: 'S&P 500 daily change',
      value: `${changeSign}${signals.indexChangePercent.toFixed(2)}%`,
      weight: '~30% weight',
    },
    {
      label: 'Market breadth',
      value: `${signals.gainersCount} gainers / ${signals.losersCount} losers`,
      weight: '~20% weight',
    },
  ];

  return (
    <ul className="fg-signals">
      {rows.map(row => (
        <li key={row.label} className="fg-signal-row">
          <span className="fg-signal-label">{row.label}</span>
          <span className="fg-signal-value">{row.value}</span>
          <span className="fg-signal-weight">{row.weight}</span>
        </li>
      ))}
    </ul>
  );
};

export default FearGreedSignals;
