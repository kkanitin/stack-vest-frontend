import React, { memo } from 'react';
import { intensity } from '../utils/perfColor';
import Sparkline from './Sparkline';
import type { WatchlistEntry } from '../hooks/useWatchlistQuotes';
import type { HistoryPoint, StockPriceChange } from '../api/stocks';

export type Period = '1D' | '1W' | '1M' | 'YTD';
type NumericKey = Exclude<keyof StockPriceChange, 'symbol'>;

export const PERIOD_KEY: Record<Period, NumericKey> = {
  '1D': '1D',
  '1W': '5D',
  '1M': '1M',
  'YTD': 'ytd',
};

function formatChange(val: number): string {
  const sign = val >= 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}%`;
}

interface Props {
  entry: WatchlistEntry;
  period?: Period;
  sparklinePoints?: HistoryPoint[];
  onClick?: (symbol: string) => void;
  isSelected?: boolean;
}

const HeatmapTile: React.FC<Props> = memo(({
  entry, period = '1D', sparklinePoints, onClick, isSelected,
}) => {
  const { item, priceChange, status } = entry;
  const change = priceChange ? priceChange[PERIOD_KEY[period]] : null;

  const dir = change === null ? undefined : change >= 0 ? 'up' : 'down';
  const changeClass = change === null ? 'neutral' : change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
  const tileAlpha = change !== null ? intensity(change) : 0;

  return (
    <button
      className={`htile${isSelected ? ' htile--selected' : ''}`}
      data-dir={dir}
      style={{ '--tile-alpha': tileAlpha } as React.CSSProperties}
      onClick={() => onClick?.(item.symbol)}
    >
      <div className="htile-top">
        <span className="htile-symbol">{item.symbol}</span>
        <div className="htile-top-end">
          {isSelected && <span className="htile-dot" aria-hidden />}
          <span className="htile-type">{item.type}</span>
        </div>
      </div>
      <div className="htile-name">{item.name}</div>

      {status === 'loading' ? (
        <>
          <div className="htile-skel htile-skel-lg" />
          <div className="htile-skel htile-skel-sm" />
        </>
      ) : status === 'error' ? (
        <>
          <div className="htile-change neutral">—</div>
          <div className="htile-period">unavailable</div>
        </>
      ) : (
        <>
          <div className={`htile-change ${changeClass}`}>
            {change !== null ? formatChange(change) : '—'}
          </div>
          <div className="htile-period">{period}</div>
          {sparklinePoints !== undefined && (
            <div className="htile-spark">
              <Sparkline points={sparklinePoints} height={32} />
            </div>
          )}
        </>
      )}
    </button>
  );
});

HeatmapTile.displayName = 'HeatmapTile';
export default HeatmapTile;
