import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fmtPct, changeTone } from '../utils/format';
import { biggestMovers } from '../utils/holdings';
import type { Holding } from '../utils/holdings';
import './Visualization.css';

const VISIBLE_LIMIT = 5;

interface MoversCardProps {
  holdings: Holding[];
  isLoading: boolean;
}

const MoversCard: React.FC<MoversCardProps> = ({ holdings, isLoading }) => {
  const movers = useMemo(() => biggestMovers(holdings, VISIBLE_LIMIT), [holdings]);

  return (
    <Card className="viz-card">
      <CardHeader>
        <CardTitle className="label-caps">Biggest Movers · 24h</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          [0, 1, 2].map(i => <div key={i} className="viz-skel viz-skel--row" />)
        ) : movers.length === 0 ? (
          <p className="viz-empty-text">None of your holdings has moved in the last 24 hours.</p>
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
};

export default MoversCard;
