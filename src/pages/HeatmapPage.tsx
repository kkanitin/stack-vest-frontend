import React from 'react';
import { useWatchlistQuotes } from '../hooks/useWatchlistQuotes';
import HeatmapTile from '../components/HeatmapTile';
import './HeatmapPage.css';

const SKELETON_COUNT = 8;

const HeatmapPage: React.FC = () => {
  const { entries, watchlistStatus, watchlistError, lastUpdated, refresh } = useWatchlistQuotes();

  const formattedTime = lastUpdated
    ? lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  return (
    <>
      <div className="hm-kicker">Watchlist</div>
      <h1>Heatmap</h1>
      <p className="hm-sub">Daily price change across your watchlist — green is up, red is down.</p>

      {watchlistStatus === 'error' ? (
        <div className="hm-error">
          <span>⚠</span>
          <span className="hm-error-msg">{watchlistError}</span>
          <button className="hm-error-retry" onClick={refresh}>Retry</button>
        </div>
      ) : watchlistStatus === 'success' && entries.length === 0 ? (
        <div className="hm-empty">
          <span className="hm-empty-badge">Watchlist Empty</span>
          <p className="hm-empty-title">No stocks added yet</p>
          <p className="hm-empty-body">Add stocks to your watchlist to see their daily performance here.</p>
        </div>
      ) : (
        <>
          <div className="hm-toolbar">
            {watchlistStatus === 'success' && (
              <span className="hm-count">{entries.length} stock{entries.length !== 1 ? 's' : ''}</span>
            )}
            <button className="hm-refresh" onClick={refresh}>↻ Refresh</button>
            {formattedTime && (
              <span className="hm-updated">Updated {formattedTime}</span>
            )}
          </div>

          <div className="hm-grid">
            {watchlistStatus === 'loading'
              ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                  <div key={i} className="htile" style={{ pointerEvents: 'none' }}>
                    <div className="htile-top">
                      <div className="htile-skel" style={{ height: 15, width: '45%' }} />
                      <div className="htile-skel" style={{ height: 15, width: '25%', borderRadius: 4 }} />
                    </div>
                    <div className="htile-skel" style={{ height: 11, width: '70%', marginBottom: 14 }} />
                    <div className="htile-skel htile-skel-lg" />
                    <div className="htile-skel htile-skel-sm" />
                  </div>
                ))
              : entries.map(entry => (
                  <HeatmapTile key={entry.item.id} entry={entry} />
                ))
            }
          </div>
        </>
      )}
    </>
  );
};

export default HeatmapPage;
