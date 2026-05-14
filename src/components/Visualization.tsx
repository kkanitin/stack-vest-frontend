import React, { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

const GREETINGS = (import.meta.env.VITE_GREETINGS?.split(';') || [
  'Ready to stack,',
  'To the moon,',
  'Happy investing,',
  'Stacking sats,',
  'Welcome back,',
]).filter((g: string) => g.trim() !== '');

const S = `
  .viz-greeting{margin:0 0 4px;line-height:1;}
  .viz-sub{font-size:15px;color:var(--text);margin:0 0 36px;font-weight:300;}
  .viz-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1px;background:var(--border);border:1px solid var(--border);}
  .viz-card{background:var(--card);padding:28px 24px;}
  .viz-card-label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.14em;color:var(--text);opacity:.65;margin:0 0 14px;}
  .viz-card-value{font-size:30px;font-weight:700;color:var(--text-h);margin-bottom:6px;letter-spacing:-.03em;font-family:var(--mono);}
  .viz-card-delta{font-size:13px;font-weight:600;display:flex;align-items:center;gap:4px;font-family:var(--mono);}
  .viz-card-delta.up{color:var(--success);}
  .viz-card-delta.warn{color:var(--warning);}
  .viz-card-body{font-size:14px;font-weight:300;color:var(--text);line-height:1.65;}
  .viz-card-title{font-size:17px;font-weight:600;color:var(--text-h);margin-bottom:8px;font-family:var(--heading);}
  .viz-activity{font-size:14px;color:var(--text);}
  .viz-activity-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;}
  .viz-activity-row+.viz-activity-row{border-top:1px solid var(--border);}
  .viz-activity-name strong{color:var(--text-h);}
  .viz-section-head{display:flex;align-items:baseline;gap:14px;margin-bottom:0;}
  .viz-divider{flex:1;height:1px;background:var(--border);}
  .viz-kicker{font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--text);opacity:.45;margin-bottom:16px;}
`;

const Visualization: React.FC = () => {
  const { user } = useAuth();
  const greeting = useMemo(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)], []);
  const firstName = user?.name?.split(' ')[0] ?? 'Investor';

  return (
    <>
      <style>{S}</style>

      <div className="viz-kicker">Overview</div>
      <h1 className="viz-greeting">{greeting} {firstName}!</h1>
      <p className="viz-sub">Here's a quick look at your investment stack and market activity.</p>

      <div className="viz-grid">
        <div className="viz-card">
          <p className="viz-card-label">Portfolio Value</p>
          <div className="viz-card-value">$24,560.12</div>
          <div className="viz-card-delta up">
            <span>↑</span> 12.4% (+$2,720.00)
          </div>
        </div>

        <div className="viz-card">
          <p className="viz-card-label">Market Status</p>
          <div className="viz-card-title">Bullish Sentiment</div>
          <p className="viz-card-body">BTC and ETH showing strong recovery in the last 24h with increased volume.</p>
        </div>

        <div className="viz-card">
          <p className="viz-card-label">Recent Activity</p>
          <div className="viz-activity">
            <div className="viz-activity-row">
              <span className="viz-activity-name"><strong>Solstack</strong> Rebalanced</span>
              <span className="viz-card-delta up">+2.1%</span>
            </div>
            <div className="viz-activity-row">
              <span className="viz-activity-name"><strong>Market</strong> Volatility</span>
              <span className="viz-card-delta warn">High</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Visualization;
