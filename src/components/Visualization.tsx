import React, { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

const GREETINGS = (import.meta.env.VITE_GREETINGS?.split(';') || [
  "Ready to stack,",
  "To the moon,",
  "Happy investing,",
  "Stacking sats,",
  "Welcome back,",
]).filter((g: string) => g.trim() !== '');

const Visualization: React.FC = () => {
  const { user } = useAuth();
  
  const greeting = useMemo(() => {
    return GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
  }, []);

  return (
    <section id="center" style={{ textAlign: 'center', marginBottom: '4rem' }}>
      <h1>{greeting} {user?.name?.split(' ')[0]}!</h1>
      <p>Here's a quick look at your investment stack and market activity.</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '3rem' }}>
        <div style={{ padding: '2rem', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--bg)', textAlign: 'left', boxShadow: 'var(--shadow)' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text)', opacity: 0.8 }}>Portfolio Value</h3>
          <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--text-h)', marginBottom: '8px', letterSpacing: '-0.02em' }}>$24,560.12</div>
          <div style={{ color: 'var(--success)', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>↑</span> 12.4% (+$2,720.00)
          </div>
        </div>
        
        <div style={{ padding: '2rem', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--bg)', textAlign: 'left', boxShadow: 'var(--shadow)' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text)', opacity: 0.8 }}>Market Status</h3>
          <div style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-h)', marginBottom: '8px' }}>Bullish Sentiment</div>
          <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: '1.5' }}>BTC and ETH showing strong recovery in last 24h with increased volume.</p>
        </div>
        
        <div style={{ padding: '2rem', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--bg)', textAlign: 'left', boxShadow: 'var(--shadow)' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text)', opacity: 0.8 }}>Recent Activity</h3>
          <div style={{ fontSize: '14px', color: 'var(--text)' }}>
            <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <span><strong>Solstack</strong> Rebalanced</span>
              <span style={{ color: 'var(--success)' }}>+2.1%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span><strong>Market</strong> Volatility</span>
              <span style={{ color: '#f59e0b' }}>High</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Visualization;
