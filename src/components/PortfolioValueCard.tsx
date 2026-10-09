import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePortfoliosSummary } from '../hooks/usePortfoliosSummary';
import { fmtMoney, fmtPct, fmtSignedMoney, changeTone } from '../utils/format';
import type { ChangeTone } from '../utils/format';
import { changeUsdFromPct } from '../utils/portfolioStats';
import PortfolioValueChart from './PortfolioValueChart';
import './Visualization.css';

const TONE_VARIANT = {
  positive: 'success',
  negative: 'error',
  neutral: 'neutral',
} as const satisfies Record<ChangeTone, 'success' | 'error' | 'neutral'>;

const PortfolioValueCard: React.FC = () => {
  const { data: summary, isLoading, isError, isFetching } = usePortfoliosSummary();
  const change30d = summary ? changeUsdFromPct(summary.totalValue, summary.changePct) : null;

  return (
    <Card className={`viz-card viz-card--hero${isFetching && !isLoading ? ' viz-card--fetching' : ''}`}>
      <CardHeader>
        <CardTitle className="label-caps">Total Portfolio Value</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="viz-skel viz-skel--value" />
        ) : isError ? (
          <div className="viz-value viz-value--dim">Couldn't load summary</div>
        ) : summary ? (
          <>
            <div className="viz-value viz-value--hero">{fmtMoney(summary.totalValue)}</div>
            {change30d !== null && (
              <div className="viz-card-meta">
                <Badge variant={TONE_VARIANT[changeTone(summary.changePct)]} className="font-mono">
                  {fmtPct(summary.changePct)}
                </Badge>
                <span className="viz-card-meta-sub">
                  {fmtSignedMoney(change30d)} over 30 days, time-weighted (money you add or withdraw is excluded)
                </span>
              </div>
            )}
            <div className="viz-card-meta viz-card-pnl">
              <span className="viz-card-meta-sub">
                Realised{' '}
                <span className={`viz-pnl viz-pnl--${changeTone(summary.realisedPnl)}`}>{fmtSignedMoney(summary.realisedPnl)}</span>
              </span>
              <span className="viz-card-meta-sub">
                Unrealised{' '}
                <span className={`viz-pnl viz-pnl--${changeTone(summary.unrealisedPnl)}`}>{fmtSignedMoney(summary.unrealisedPnl)}</span>
              </span>
            </div>
            <p className="viz-card-meta-sub">
              Returns are now calculated from your recorded transactions, so they may differ from before.
            </p>
            {summary.totalValue > 0 && <PortfolioValueChart />}
          </>
        ) : (
          <div className="viz-value viz-value--dim">—</div>
        )}
      </CardContent>
    </Card>
  );
};

export default PortfolioValueCard;
