import React, { useMemo, useState } from 'react';
import type { PortfolioPosition } from '../api/portfolio';
import { fmtMoney, fmtPct, fmtShares } from '../utils/format';
import '../pages/PortfolioDetailPage.css';

const VISIBLE_LIMIT = 5;

interface TopAssetsTableProps {
  positions: PortfolioPosition[];
  isLoading: boolean;
  onEdit: (symbol: string) => void;
  onDelete: (symbol: string) => void;
}

const TopAssetsTable: React.FC<TopAssetsTableProps> = ({ positions, isLoading, onEdit, onDelete }) => {
  const [showAll, setShowAll] = useState(false);
  const sorted = useMemo(() => positions.slice().sort((a, b) => b.valueUsd - a.valueUsd), [positions]);

  if (isLoading) {
    return (
      <div className="pfh-wrap">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="pfd-skel pfd-skel--row" />
        ))}
      </div>
    );
  }

  const visible = showAll ? sorted : sorted.slice(0, VISIBLE_LIMIT);
  const hasMore = sorted.length > VISIBLE_LIMIT;

  return (
    <div className="pfh-wrap">
      <table className="pfh-table">
        <thead>
          <tr>
            <th className="pfh-th">Asset Name</th>
            <th className="pfh-th">Ticker</th>
            <th className="pfh-th pfh-th--right">Quantity</th>
            <th className="pfh-th pfh-th--right">Avg Price</th>
            <th className="pfh-th pfh-th--right">Market Value</th>
            <th className="pfh-th pfh-th--right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {visible.map(a => {
            const cls = a.change24h > 0 ? 'positive' : a.change24h < 0 ? 'negative' : 'neutral';
            return (
              <tr key={a.symbol} className="pfh-tr">
                <td className="pfh-td">
                  <div className="pfh-asset">
                    <span className="pfh-asset-icon" aria-hidden="true">{a.symbol.charAt(0)}</span>
                    <span className="pfh-asset-name" title={a.name}>{a.name}</span>
                  </div>
                </td>
                <td className="pfh-td pfh-td--mono pfh-ticker">{a.symbol}</td>
                <td className="pfh-td pfh-td--mono pfh-td--right">{fmtShares(a.shares)}</td>
                <td className="pfh-td pfh-td--mono pfh-td--right">{fmtMoney(a.avgCost)}</td>
                <td className="pfh-td pfh-td--right">
                  <div className="pfh-mv">
                    <span className="pfh-mv-value">
                      {a.valueUsd > 0 ? fmtMoney(a.valueUsd) : <span className="pfh-dim">—</span>}
                    </span>
                    <span className={`pfh-mv-change ${cls}`}>{fmtPct(a.change24h)}</span>
                  </div>
                </td>
                <td className="pfh-td pfh-td--right">
                  <div className="pfh-actions">
                    <button
                      type="button"
                      className="pfh-action-btn"
                      onClick={() => onEdit(a.symbol)}
                      aria-label={`Edit ${a.symbol} position`}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="pfh-action-btn pfh-action-btn--danger"
                      onClick={() => onDelete(a.symbol)}
                      aria-label={`Delete ${a.symbol} position`}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {hasMore && (
        <div className="pfh-foot">
          <button type="button" className="pfh-viewall" onClick={() => setShowAll(s => !s)}>
            {showAll ? 'Show fewer' : `View All Holdings (${sorted.length})`}
          </button>
        </div>
      )}
    </div>
  );
};

export default TopAssetsTable;
