import React from 'react';

const S = `
  .dca-kicker{font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--text);opacity:.45;margin-bottom:16px;}
  .dca-h{margin:0 0 6px;}
  .dca-sub{font-size:15px;color:var(--text);margin:0 0 40px;font-weight:300;}
  .dca-coming{border:1px solid var(--border);border-top:3px solid var(--text-h);background:var(--card);padding:48px 40px;max-width:520px;}
  .dca-coming-icon{font-size:36px;margin-bottom:20px;display:block;}
  .dca-coming-h{font-family:'Bebas Neue',impact,sans-serif;font-size:32px;letter-spacing:.02em;color:var(--text-h);margin:0 0 12px;}
  .dca-coming-body{font-size:14px;color:var(--text);line-height:1.7;font-weight:300;margin:0 0 24px;}
  .dca-features{display:flex;flex-direction:column;gap:8px;}
  .dca-feature{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--text);}
  .dca-feature-dot{width:4px;height:4px;background:var(--accent);flex-shrink:0;}
  .dca-tag{display:inline-flex;align-items:center;gap:6px;padding:3px 8px;font-size:9px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;border:1px solid var(--accent-border);color:var(--accent);background:var(--accent-bg);margin-bottom:20px;}
`;

const DCASimulation: React.FC = () => (
  <>
    <style>{S}</style>
    <div className="dca-kicker">Tools</div>
    <h1 className="dca-h">DCA Simulation</h1>
    <p className="dca-sub">Model dollar-cost averaging strategies across any asset.</p>

    <div className="dca-coming">
      <span className="dca-tag">In Development</span>
      <span className="dca-coming-icon">🏗️</span>
      <div className="dca-coming-h">Coming Soon</div>
      <p className="dca-coming-body">
        You'll be able to backtest and project DCA strategies across BTC, ETH, and your custom asset mix — with configurable intervals, amounts, and time horizons.
      </p>
      <div className="dca-features">
        {['Custom asset selection', 'Weekly / monthly intervals', 'Historical back-testing', 'Portfolio projection charts'].map(f => (
          <div className="dca-feature" key={f}>
            <span className="dca-feature-dot" />
            {f}
          </div>
        ))}
      </div>
    </div>
  </>
);

export default DCASimulation;
