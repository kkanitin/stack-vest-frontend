import React, { useMemo, useState } from 'react';
import type { PortfolioPosition } from '../api/portfolio';
import { fmtMoney, fmtPct, fmtShares, fmtSignedMoney, changeTone } from '../utils/format';
import '../pages/PortfolioDetailPage.css';

const VISIBLE_LIMIT = 5;

interface TopAssetsTableProps {
  positions: PortfolioPosition[];
  /** Fully sold holdings, listed under "Closed holdings" with their realised P&L. */
  closedPositions?: PortfolioPosition[];
  isLoading: boolean;
  onBuy: (position: PortfolioPosition) => void;
  onSell: (position: PortfolioPosition) => void;
  onHistory: (position: PortfolioPosition) => void;
  /** Removes the holding and its entire transaction history. */
  onDelete: (symbol: string) => void;
}

const TopAssetsTable: React.FC<TopAssetsTableProps> = ({
  positions,
  closedPositions = [],
  isLoading,
  onBuy,
  onSell,
  onHistory,
  onDelete,
}) => {
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
            <th className="pfh-th pfh-th--right">Unrealised P&amp;L</th>
            <th className="pfh-th pfh-th--right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {visible.map(a => {
            const cls = changeTone(a.change24h);
            const pnlTone = changeTone(a.unrealisedPnl);
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
                  <div className="pfh-mv">
                    {a.valueUsd > 0 ? (
                      <>
                        <span className={`pfh-mv-change ${pnlTone}`}>{fmtSignedMoney(a.unrealisedPnl)}</span>
                        <span className={`pfh-mv-change ${pnlTone}`}>{fmtPct(a.unrealisedPnlPct)}</span>
                      </>
                    ) : (
                      <span className="pfh-dim">—</span>
                    )}
                  </div>
                </td>
                <td className="pfh-td pfh-td--right">
                  <div className="pfh-actions">
                    <button
                      type="button"
                      className="pfh-action-btn"
                      onClick={() => onBuy(a)}
                      aria-label={`Buy ${a.symbol}`}
                    >
                      Buy
                    </button>
                    <button
                      type="button"
                      className="pfh-action-btn"
                      onClick={() => onSell(a)}
                      aria-label={`Sell ${a.symbol}`}
                    >
                      Sell
                    </button>
                    <button
                      type="button"
                      className="pfh-action-btn"
                      onClick={() => onHistory(a)}
                      aria-label={`${a.symbol} history`}
                    >
                      History
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

      {closedPositions.length > 0 && (
        <section className="pfh-closed" aria-label="Closed holdings">
          <h3 className="pfh-closed-title">Closed holdings</h3>
          <table className="pfh-table">
            <thead>
              <tr>
                <th className="pfh-th">Asset Name</th>
                <th className="pfh-th">Ticker</th>
                <th className="pfh-th pfh-th--right">Realised P&amp;L</th>
                <th className="pfh-th pfh-th--right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {closedPositions.map(c => (
                <tr key={c.symbol} className="pfh-tr">
                  <td className="pfh-td">
                    <div className="pfh-asset">
                      <span className="pfh-asset-icon" aria-hidden="true">{c.symbol.charAt(0)}</span>
                      <span className="pfh-asset-name" title={c.name}>{c.name}</span>
                    </div>
                  </td>
                  <td className="pfh-td pfh-td--mono pfh-ticker">{c.symbol}</td>
                  <td className="pfh-td pfh-td--right">
                    <span className={`pfh-mv-change ${changeTone(c.realisedPnl)}`}>{fmtSignedMoney(c.realisedPnl)}</span>
                  </td>
                  <td className="pfh-td pfh-td--right">
                    <div className="pfh-actions">
                      <button type="button" className="pfh-action-btn" onClick={() => onBuy(c)} aria-label={`Buy ${c.symbol}`}>
                        Buy
                      </button>
                      <button type="button" className="pfh-action-btn" onClick={() => onHistory(c)} aria-label={`${c.symbol} history`}>
                        History
                      </button>
                      <button
                        type="button"
                        className="pfh-action-btn pfh-action-btn--danger"
                        onClick={() => onDelete(c.symbol)}
                        aria-label={`Delete ${c.symbol} position`}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
};

export default TopAssetsTable;
