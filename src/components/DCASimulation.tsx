import React from 'react';

const DCASimulation: React.FC = () => {
  return (
    <section id="center" style={{ textAlign: 'center', marginBottom: '4rem' }}>
      <h1>DCA Simulation</h1>
      <p>This feature is currently in development. Stay tuned!</p>
      
      <div style={{ marginTop: '3rem', padding: '3rem', border: '1px dashed var(--border)', borderRadius: '8px', background: 'var(--accent-bg)', opacity: 0.7 }}>
        <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🏗️</div>
        <h3 style={{ color: 'var(--text-h)' }}>Coming Soon</h3>
        <p>You will be able to simulate Dollar Cost Averaging strategies for various assets.</p>
      </div>
    </section>
  );
};

export default DCASimulation;
