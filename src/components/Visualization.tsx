import React, { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import './Visualization.css';

const GREETINGS = (import.meta.env.VITE_GREETINGS?.split(';') || [
  'Ready to stack,',
  'To the moon,',
  'Happy investing,',
  'Stacking sats,',
  'Welcome back,',
]).filter((g: string) => g.trim() !== '');


const Visualization: React.FC = () => {
  const { user } = useAuth();
  const greeting = useMemo(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)], []);
  const firstName = user?.name?.split(' ')[0] ?? 'Investor';

  return (
    <>
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
