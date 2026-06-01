import React, { memo } from 'react';
import Sparkline from './Sparkline';
import type { WatchlistEntry } from '../hooks/useWatchlistQuotes';
import type { HistoryPoint, StockPriceChange } from '../api/stocks';

type Period = '1D' | '1W' | '1M' | 'YTD';
type NumericKey = Exclude<keyof StockPriceChange, 'symbol'>;

const PERIOD_KEY: Record<Period, NumericKey> = {
  '1D': '1D',
  '1W': '5D',
  '1M': '1M',
  'YTD': 'ytd',
};

interface SparklineRowProps {
  entry: WatchlistEntry;
  sparklinePoints: HistoryPoint[] | undefined;
  period: Period;
  isSelected: boolean;
  isAtLimit: boolean;
  onSelect: (symbol: string) => void;
  onClick: (symbol: string) => void;
}

const SparklineRow: React.FC<SparklineRowProps> = memo(({
  entry, sparklinePoints, period, isSelected, isAtLimit, onSelect, onClick,
}) => {
  const { item, priceChange } = entry;
  const val = priceChange ? priceChange[PERIOD_KEY[period]] : null;
  const cls = val === null ? 'neutral' : val > 0 ? 'positive' : val < 0 ? 'negative' : 'neutral';
  const pctText = val !== null ? `${val > 0 ? '+' : ''}${val.toFixed(2)}%` : '—';

  return (
    <div className="sl-row" onClick={() => onClick(item.symbol)} role="row">
      <label className="sl-check-wrap" onClick={e => e.stopPropagation()}>
        <input
          type="checkbox"
          className="sl-checkbox"
          checked={isSelected}
          disabled={!isSelected && isAtLimit}
          onChange={() => onSelect(item.symbol)}
          aria-label={`Compare ${item.symbol}`}
        />
      </label>
      <div className="sl-asset">
        <span className="sl-symbol">{item.symbol}</span>
        <span className="sl-name">{item.name}</span>
      </div>
      <div className="sl-spark-wrap">
        <Sparkline points={sparklinePoints ?? []} height={24} />
      </div>
      <span className={`sl-pct ${cls}`}>{pctText}</span>
    </div>
  );
});

SparklineRow.displayName = 'SparklineRow';
export default SparklineRow;
