import React from 'react';
import './DCASimulation.css';

const DCASimulation: React.FC = () => (
  <>
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
