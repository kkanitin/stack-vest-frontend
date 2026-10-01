import React from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fmtMoney, fmtPct, changeTone } from '../utils/format';
import type { Holding } from '../utils/holdings';
import './Visualization.css';

const VISIBLE_LIMIT = 5;

interface TopHoldingsCardProps {
  holdings: Holding[];
  isLoading: boolean;
}

const TopHoldingsCard: React.FC<TopHoldingsCardProps> = ({ holdings, isLoading }) => {
  const visible = holdings.slice(0, VISIBLE_LIMIT);

  return (
    <Card className="viz-card">
      <CardHeader>
        <CardTitle className="label-caps">Top Holdings</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          [0, 1, 2, 3].map(i => <div key={i} className="viz-skel viz-skel--row" />)
        ) : (
          <>
            <div className="viz-table-wrap">
              <table className="viz-table">
                <thead>
                  <tr>
                    <th className="viz-th">Asset</th>
                    <th className="viz-th viz-th--right">Value</th>
                    <th className="viz-th viz-th--right viz-col-weight">Weight</th>
                    <th className="viz-th viz-th--right">24h</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map(h => (
                    <tr key={h.symbol} className="viz-tr">
                      <td className="viz-td">
                        <div className="viz-asset">
                          <span className="viz-asset-symbol">{h.symbol}</span>
                          <span className="viz-asset-name" title={h.name}>{h.name}</span>
                        </div>
                      </td>
                      <td className="viz-td viz-td--right viz-td--mono">
                        {h.valueUsd > 0 ? fmtMoney(h.valueUsd) : '—'}
                      </td>
                      <td className="viz-td viz-td--right viz-col-weight">
                        <div className="viz-weight">
                          <span className="viz-weight-track" aria-hidden="true">
                            <span className="viz-weight-fill" style={{ width: `${Math.min(100, h.weight)}%` }} />
                          </span>
                          <span className="viz-weight-pct">{h.valueUsd > 0 ? `${h.weight.toFixed(1)}%` : '—'}</span>
                        </div>
                      </td>
                      <td className={`viz-td viz-td--right viz-td--mono viz-change ${changeTone(h.change24h)}`}>
                        {h.valueUsd > 0 ? fmtPct(h.change24h) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="viz-card-foot">
              <span className="viz-card-meta-sub">
                {holdings.length > VISIBLE_LIMIT
                  ? `Largest ${VISIBLE_LIMIT} of ${holdings.length} holdings`
                  : `${holdings.length} ${holdings.length === 1 ? 'holding' : 'holdings'}`}
              </span>
              <Link to="/dashboard/portfolios" className="viz-empty-cta">View portfolios</Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TopHoldingsCard;
