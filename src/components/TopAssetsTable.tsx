import React, { useMemo } from 'react';
import type { PortfolioPosition } from '../api/portfolio';
import './Visualization.css';

function fmtMoney(n: number): string {
  return `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtShares(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 8 });
}

interface TopAssetsTableProps {
  positions: PortfolioPosition[];
  isLoading: boolean;
  onEdit: (symbol: string) => void;
}

const TopAssetsTable: React.FC<TopAssetsTableProps> = ({ positions, isLoading, onEdit }) => {
  const sorted = useMemo(() => positions.slice().sort((a, b) => b.valueUsd - a.valueUsd), [positions]);

  if (isLoading) {
    return (
      <div className="viz-table-wrap">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="viz-skel viz-skel--row" />
        ))}
      </div>
    );
  }

  return (
    <div className="viz-table-wrap">
      <table className="viz-table">
        <thead>
          <tr>
            <th className="viz-th">Asset</th>
            <th className="viz-th viz-th--right">Balance</th>
            <th className="viz-th viz-th--right">Value (USD)</th>
            <th className="viz-th viz-th--right">24h</th>
            <th className="viz-th viz-th--right">Edit</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(a => {
            const cls = a.change24h > 0 ? 'positive' : a.change24h < 0 ? 'negative' : 'neutral';
            return (
              <tr key={a.symbol} className="viz-tr">
                <td className="viz-td">
                  <div className="viz-asset">
                    <span className="viz-asset-symbol">{a.symbol}</span>
                    <span className="viz-asset-name" title={a.name}>{a.name}</span>
                  </div>
                </td>
                <td className="viz-td viz-td--mono viz-td--right">{fmtShares(a.shares)}</td>
                <td className="viz-td viz-td--mono viz-td--right">
                  {a.valueUsd > 0 ? fmtMoney(a.valueUsd) : <span className="viz-value--dim">—</span>}
                </td>
                <td className={`viz-td viz-td--mono viz-td--right viz-change ${cls}`}>{fmtPct(a.change24h)}</td>
                <td className="viz-td viz-td--right">
                  <button
                    type="button"
                    className="viz-edit-btn"
                    onClick={() => onEdit(a.symbol)}
                    aria-label={`Edit ${a.symbol} position`}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TopAssetsTable;
