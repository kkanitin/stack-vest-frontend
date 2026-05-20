import React from 'react';
import type { WatchlistEntry } from '../hooks/useWatchlistQuotes';

function formatChange(val: number): string {
  const sign = val >= 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}%`;
}

// Tint scale: 5 buckets per direction (matches DESIGN.md performance scale).
function intensity(pct: number): number {
  const mag = Math.min(Math.abs(pct) / 5, 1);
  return 0.06 + mag * 0.22;
}

interface Props {
  entry: WatchlistEntry;
}

const HeatmapTile: React.FC<Props> = ({ entry }) => {
  const { item, priceChange, status } = entry;
  const change1D = priceChange?.['1D'] ?? null;

  const dir = change1D === null ? undefined : change1D >= 0 ? 'up' : 'down';
  const changeClass = change1D === null ? 'neutral' : change1D > 0 ? 'positive' : change1D < 0 ? 'negative' : 'neutral';
  const tileAlpha = change1D !== null ? intensity(change1D) : 0;

  return (
    <button
      className="htile"
      data-dir={dir}
      style={{ '--tile-alpha': tileAlpha } as React.CSSProperties}
    >
      <div className="htile-top">
        <span className="htile-symbol">{item.symbol}</span>
        <span className="htile-type">{item.type}</span>
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
            {change1D !== null ? formatChange(change1D) : '—'}
          </div>
          <div className="htile-period">24h</div>
        </>
      )}
    </button>
  );
};

export default HeatmapTile;
