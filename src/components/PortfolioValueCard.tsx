import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePortfolioSummary } from '../hooks/usePortfolioSummary';
import './Visualization.css';

function fmtMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

const PortfolioValueCard: React.FC = () => {
  const { data: summary, isLoading, isError, isFetching } = usePortfolioSummary();

  return (
    <Card className={`viz-card${isFetching && !isLoading ? ' viz-card--fetching' : ''}`}>
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
            <div className="viz-value">{fmtMoney(summary.totalValue)}</div>
            {Number.isFinite(summary.changePct30d) && Number.isFinite(summary.change30d) && (
              <div className="viz-card-meta">
                <Badge variant={summary.changePct30d >= 0 ? 'success' : 'error'} className="font-mono">
                  {fmtPct(summary.changePct30d)}
                </Badge>
                <span className="viz-card-meta-sub">
                  {summary.change30d >= 0 ? '+' : '-'}{fmtMoney(summary.change30d)} · 30d
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="viz-value viz-value--dim">—</div>
        )}
      </CardContent>
    </Card>
  );
};

export default PortfolioValueCard;
