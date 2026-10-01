import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { computeMarketStatus } from '../utils/marketStatus';
import { biggestMovers } from '../utils/holdings';
import type { Holding } from '../utils/holdings';
import { fmtPct, changeTone } from '../utils/format';
import './Visualization.css';

const MOVERS_LIMIT = 4;

interface MarketStatusCardProps {
  /** One entry per symbol, merged across portfolios. */
  holdings: Holding[];
  isLoading: boolean;
  isError: boolean;
}

/** How the user's own holdings moved over the last 24 hours, and which moved most. */
const MarketStatusCard: React.FC<MarketStatusCardProps> = ({ holdings, isLoading, isError }) => {
  const status = useMemo(() => computeMarketStatus(holdings), [holdings]);
  const movers = useMemo(() => biggestMovers(holdings, MOVERS_LIMIT), [holdings]);

  return (
    <Card className="viz-card">
      <CardHeader>
        <CardTitle className="label-caps">Your Holdings Today</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <div className="viz-skel viz-skel--title" />
            <div className="viz-skel viz-skel--body" />
          </>
        ) : isError ? (
          <>
            <div className="viz-card-title">Unavailable</div>
            <p className="viz-card-body">Couldn't load your holdings.</p>
          </>
        ) : (
          <>
            <div className="viz-card-title">{status.label}</div>
            <p className="viz-card-body">{status.descriptor}</p>
            {status.sentiment !== 'empty' && (
              <div className="viz-status-stats">
                <span className="viz-status-stat viz-status-stat--up">▲ {status.upCount} up</span>
                <span className="viz-status-stat viz-status-stat--down">▼ {status.downCount} down</span>
                <span className="viz-status-stat viz-status-stat--flat">– {status.flatCount} flat</span>
              </div>
            )}
            {movers.length > 0 && (
              <section className="viz-movers" aria-label="Biggest movers in the last 24 hours">
                <h3 className="viz-movers-title">Biggest movers</h3>
                <ul className="viz-list">
                  {movers.map(h => {
                    const tone = changeTone(h.change24h);
                    return (
                      <li key={h.symbol} className="viz-list-row">
                        <div className="viz-asset">
                          <span className="viz-asset-symbol">{h.symbol}</span>
                          <span className="viz-asset-name" title={h.name}>{h.name}</span>
                        </div>
                        <span className={`viz-mover-change viz-change ${tone}`}>
                          <span aria-hidden="true">{tone === 'positive' ? '▲' : '▼'}</span> {fmtPct(h.change24h)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MarketStatusCard;
