import React from 'react';
import { useWatchlistQuotes } from '../hooks/useWatchlistQuotes';
import HeatmapTile from '../components/HeatmapTile';

const S = `
  /* Page header */
  .hm-kicker{font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--text);opacity:.45;margin-bottom:16px;}
  .hm-sub{font-size:15px;color:var(--text);margin:0 0 28px;font-weight:300;}

  /* Toolbar */
  .hm-toolbar{display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap;}
  .hm-count{font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:3px 8px;background:var(--accent-bg);color:var(--accent);border:1px solid var(--accent-border);border-radius:4px;font-family:var(--mono);}
  .hm-updated{font-size:11px;color:var(--text);opacity:.45;font-family:var(--mono);margin-left:auto;}
  .hm-refresh{font-size:11px;font-weight:600;letter-spacing:.04em;padding:5px 14px;background:transparent;border:1px solid var(--border);color:var(--text);cursor:pointer;transition:all 200ms cubic-bezier(0.4,0,0.2,1);border-radius:8px;font-family:var(--sans);}
  .hm-refresh:hover{border-color:var(--text-h);color:var(--text-h);transform:translateY(-1px);box-shadow:var(--shadow);}

  /* Grid */
  .hm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:2px;background:var(--border);border:1px solid var(--border);}

  /* Tile base */
  .htile{position:relative;background:var(--card);padding:16px;border:none;cursor:pointer;text-align:left;width:100%;overflow:hidden;transition:transform 200ms cubic-bezier(0.4,0,0.2,1),box-shadow 200ms cubic-bezier(0.4,0,0.2,1);}
  .htile:hover{transform:translateY(-1px);box-shadow:var(--shadow);z-index:1;}

  /* Tile tint overlay — uses ::before so it inherits card bg correctly in both themes */
  .htile::before{content:'';position:absolute;inset:0;pointer-events:none;opacity:0;}
  .htile[data-dir="up"]::before{background:var(--success);opacity:var(--tile-alpha,0);}
  .htile[data-dir="down"]::before{background:var(--accent);opacity:var(--tile-alpha,0);}

  /* Tile content sits above the tint layer */
  .htile-top{position:relative;display:flex;align-items:flex-start;justify-content:space-between;gap:6px;margin-bottom:3px;}
  .htile-symbol{position:relative;font-family:var(--mono);font-size:15px;font-weight:700;color:var(--text-h);letter-spacing:-0.02em;}
  .htile-type{position:relative;font-size:8px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:2px 5px;background:var(--accent-bg);color:var(--accent);border:1px solid var(--accent-border);border-radius:4px;flex-shrink:0;margin-top:2px;}
  .htile-name{position:relative;font-size:11px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:14px;}
  .htile-change{position:relative;font-family:var(--mono);font-size:20px;font-weight:700;letter-spacing:-0.03em;margin-bottom:3px;}
  .htile-change.positive{color:var(--success);}
  .htile-change.negative{color:var(--accent);}
  .htile-change.neutral{color:var(--text);opacity:.35;}
  .htile-period{position:relative;font-size:9px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--text);opacity:.45;}

  /* Skeleton shimmer */
  @keyframes hshimmer{0%{background-position:-200% 0;}100%{background-position:200% 0;}}
  .htile-skel{position:relative;border-radius:4px;background:linear-gradient(90deg,var(--border) 25%,var(--card) 50%,var(--border) 75%);background-size:200% 100%;animation:hshimmer 1.4s ease-in-out infinite;}
  .htile-skel-lg{height:20px;width:60%;margin-bottom:5px;}
  .htile-skel-sm{height:10px;width:30%;}

  /* Empty state */
  .hm-empty{border:1px solid var(--border);padding:52px 32px;text-align:center;}
  .hm-empty-badge{font-size:9px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;padding:3px 9px;background:var(--accent-bg);color:var(--accent);border:1px solid var(--accent-border);border-radius:4px;display:inline-block;margin-bottom:20px;}
  .hm-empty-title{font-family:var(--heading);font-size:18px;font-weight:600;color:var(--text-h);margin:0 0 8px;letter-spacing:-0.02em;}
  .hm-empty-body{font-size:14px;color:var(--text);font-weight:300;margin:0;}

  /* Error banner */
  .hm-error{padding:14px 18px;border:1px solid var(--accent-border);background:var(--accent-bg);color:var(--accent);font-size:13px;display:flex;align-items:center;gap:10px;border-radius:8px;}
  .hm-error-msg{flex:1;}
  .hm-error-retry{background:transparent;border:1px solid var(--accent-border);color:var(--accent);font-size:12px;font-weight:600;padding:4px 12px;cursor:pointer;border-radius:8px;transition:all 200ms cubic-bezier(0.4,0,0.2,1);font-family:var(--sans);}
  .hm-error-retry:hover{background:var(--accent);color:#fff;}

  @media(max-width:767px){.hm-toolbar{flex-direction:column;align-items:flex-start;gap:8px;}.hm-updated{margin-left:0;}}
  @media(max-width:600px){.hm-grid{grid-template-columns:repeat(auto-fill,minmax(120px,1fr));}}
  @media(max-width:400px){.hm-grid{grid-template-columns:repeat(auto-fill,minmax(100px,1fr));}}
`;

const SKELETON_COUNT = 8;

const HeatmapPage: React.FC = () => {
  const { entries, watchlistStatus, watchlistError, lastUpdated, refresh } = useWatchlistQuotes();

  const formattedTime = lastUpdated
    ? lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  return (
    <>
      <style>{S}</style>

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
