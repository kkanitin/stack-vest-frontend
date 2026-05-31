import React, { useState } from 'react';
import { useWatchlistQuotes } from '../hooks/useWatchlistQuotes';
import { usePopularAssets } from '../hooks/usePopularAssets';
import HeatmapTile from '../components/HeatmapTile';
import SegmentedControl from '../components/ui/SegmentedControl';
import type { Segment } from '../components/ui/SegmentedControl';
import Button from '../components/ui/Button';
import type { WatchlistEntry } from '../hooks/useWatchlistQuotes';
import './HeatmapPage.css';

type FilterValue = 'all' | 'technology' | 'healthcare' | 'finance';

const FILTERS: Segment<FilterValue>[] = [
  { value: 'all', label: 'All Assets' },
  { value: 'technology', label: 'Technology' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'finance', label: 'Finance' },
];

const CATEGORY_MAP: Record<Exclude<FilterValue, 'all'>, string> = {
  technology: 'Technology',
  healthcare: 'Healthcare',
  finance: 'Finance',
};

const SKELETON_COUNT = 8;

const HeatmapPage: React.FC = () => {
  const { entries, watchlistStatus, watchlistError, lastUpdated, refresh } = useWatchlistQuotes();
  const [filter, setFilter] = useState<FilterValue>('all');

  const formattedTime = lastUpdated
    ? lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : null;

  const showPopular = watchlistStatus === 'success' && entries.length === 0;
  const { entries: popularEntries } = usePopularAssets(showPopular);

  const tiles: WatchlistEntry[] = showPopular ? popularEntries : entries;

  const filteredTiles = filter === 'all'
    ? tiles
    : tiles.filter(e => e.item.category.includes(CATEGORY_MAP[filter]));

  return (
    <div className="hm">
      <header className="hm-head">
        <div className="hm-head-text">
          <h1 className="hm-title">Market Heatmap</h1>
          <p className="hm-sub">Real-time investment performance across tracked assets.</p>
        </div>
        <div className="hm-toolbar">
          <SegmentedControl<FilterValue>
            segments={FILTERS}
            value={filter}
            onChange={setFilter}
            size="sm"
          />
          <span className="hm-timeframe">24H</span>
          <Button variant="outline" onClick={refresh} className="hm-refresh">
            ↻ Refresh
          </Button>
        </div>
      </header>

      <div className="hm-legend">
        <span className="hm-legend-label">Performance Scale</span>
        <span className="hm-legend-scale" aria-hidden />
        <span className="hm-legend-range">
          <span>-5%</span>
          <span>0</span>
          <span>+5%</span>
        </span>
        {formattedTime && (
          <span className="hm-updated">Updated {formattedTime}</span>
        )}
      </div>

      {watchlistStatus === 'error' ? (
        <div className="hm-error">
          <span>⚠</span>
          <span className="hm-error-msg">{watchlistError}</span>
          <Button variant="outline" onClick={refresh}>Retry</Button>
        </div>
      ) : (
        <>
          {showPopular && (
            <div className="hm-mock-banner">
              Your watchlist is empty — showing popular assets. Add assets to track real performance.
            </div>
          )}
          <div className="hm-grid">
            {watchlistStatus === 'loading'
              ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                  <div key={i} className="htile" style={{ pointerEvents: 'none' }}>
                    <div className="htile-top">
                      <div className="htile-skel" style={{ height: 14, width: '45%' }} />
                      <div className="htile-skel" style={{ height: 14, width: '25%' }} />
                    </div>
                    <div className="htile-skel" style={{ height: 11, width: '70%', marginBottom: 14 }} />
                    <div className="htile-skel htile-skel-lg" />
                    <div className="htile-skel htile-skel-sm" />
                  </div>
                ))
              : filteredTiles.length === 0 && filter !== 'all'
              ? (
                  <div className="hm-empty">No assets in this category.</div>
                )
              : filteredTiles.map(entry => (
                  <HeatmapTile key={entry.item.id} entry={entry} />
                ))
            }
          </div>
        </>
      )}
    </div>
  );
};

export default HeatmapPage;
