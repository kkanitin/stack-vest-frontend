import React from 'react';
import SparklineRow from './SparklineRow';
import type { WatchlistEntry } from '../hooks/useWatchlistQuotes';
import type { HistoryPoint } from '../api/stocks';

type Period = '1D' | '1W' | '1M' | 'YTD';

interface SparklineListProps {
  entries: WatchlistEntry[];
  sparklineMap: Map<string, HistoryPoint[]>;
  period: Period;
  selectedSymbols: Set<string>;
  onSelectSymbol: (symbol: string) => void;
  maxCompare: number;
  onTileClick: (symbol: string) => void;
}

const SparklineList: React.FC<SparklineListProps> = ({
  entries, sparklineMap, period, selectedSymbols, onSelectSymbol, maxCompare, onTileClick,
}) => {
  if (!entries.length) {
    return (
      <div className="sl-empty">
        Add assets to your watchlist to see the list view.
      </div>
    );
  }

  const atLimit = selectedSymbols.size >= maxCompare;

  return (
    <div className="sl-list" role="table" aria-label="Asset list">
      <div className="sl-header" role="row">
        <span />
        <span className="sl-col-asset">Asset</span>
        <span className="sl-col-spark">7d Trend</span>
        <span className="sl-col-pct">Change</span>
      </div>
      {entries.map(entry => (
        <SparklineRow
          key={entry.item.id}
          entry={entry}
          sparklinePoints={sparklineMap.get(entry.item.symbol)}
          period={period}
          isSelected={selectedSymbols.has(entry.item.symbol)}
          isAtLimit={atLimit}
          onSelect={onSelectSymbol}
          onClick={onTileClick}
        />
      ))}
    </div>
  );
};

export default SparklineList;
