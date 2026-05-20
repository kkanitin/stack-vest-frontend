import React, { useState } from 'react';
import { useWatchlistQuotes } from '../hooks/useWatchlistQuotes';
import HeatmapTile from '../components/HeatmapTile';
import SegmentedControl from '../components/ui/SegmentedControl';
import type { Segment } from '../components/ui/SegmentedControl';
import Button from '../components/ui/Button';
import type { WatchlistEntry } from '../hooks/useWatchlistQuotes';
import './HeatmapPage.css';

type FilterValue = 'all' | 'top100' | 'defi' | 'l1';

const FILTERS: Segment<FilterValue>[] = [
  { value: 'all', label: 'All Assets' },
  { value: 'top100', label: 'Top 100' },
  { value: 'defi', label: 'DeFi' },
  { value: 'l1', label: 'L1s' },
];

// TODO(mock): when the user has no watchlist entries, we render this demo grid
// so the screen still demonstrates the heatmap pattern. Replace with a real
// "popular" feed once an endpoint exists.
function makeMockChange(symbol: string, pct: number) {
  return { symbol, '1D': pct, '5D': 0, '1M': 0, '3M': 0, '6M': 0, ytd: 0, '1Y': 0, '3Y': 0, '5Y': 0, '10Y': 0, max: 0 };
}

function mockTile(id: string, symbol: string, name: string, pct: number): WatchlistEntry {
  return {
    item: { id, userId: 'mock', symbol, name, type: 'Crypto', addedAt: new Date().toISOString() },
    priceChange: makeMockChange(symbol, pct),
    status: 'success',
    error: null,
  };
}

const MOCK_TILES: WatchlistEntry[] = [
  mockTile('m-btc', 'BTC', 'Bitcoin', 2.34),
  mockTile('m-eth', 'ETH', 'Ethereum', 1.12),
  mockTile('m-sol', 'SOL', 'Solana', -0.84),
  mockTile('m-avax', 'AVAX', 'Avalanche', -3.20),
  mockTile('m-link', 'LINK', 'Chainlink', 0.42),
  mockTile('m-uni', 'UNI', 'Uniswap', 4.10),
  mockTile('m-aave', 'AAVE', 'Aave', -1.55),
  mockTile('m-doge', 'DOGE', 'Dogecoin', 0.12),
];

const SKELETON_COUNT = 8;

const HeatmapPage: React.FC = () => {
  const { entries, watchlistStatus, watchlistError, lastUpdated, refresh } = useWatchlistQuotes();
  const [filter, setFilter] = useState<FilterValue>('all');

  const formattedTime = lastUpdated
    ? lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : null;

  const showMock = watchlistStatus === 'success' && entries.length === 0;
  const tiles: WatchlistEntry[] = showMock ? MOCK_TILES : entries;

  return (
    <div className="hm">
      <header className="hm-head">
        <div className="hm-head-text">
          <h1 className="hm-title">Market Heatmap</h1>
          <p className="hm-sub">Real-time investment performance across tracked assets.</p>
        </div>
        <div className="hm-toolbar">
          {/* TODO(mock): segmented filter is presentational; backend filter not wired yet. */}
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
          {showMock && (
            <div className="hm-mock-banner">
              {/* TODO(mock): empty-state demo grid */}
              Your watchlist is empty — these tiles are sample data. Add assets to track real performance.
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
              : tiles.map(entry => (
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
