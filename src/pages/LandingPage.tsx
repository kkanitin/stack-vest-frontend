import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, NavLink, Outlet } from 'react-router-dom';
import heroImg from '../assets/hero.png';

const LandingPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', textAlign: 'left' }}>
      {/* Sidebar */}
      <aside style={{ 
        width: '280px', 
        borderRight: '1px solid var(--border)', 
        padding: '2.5rem 1.5rem', 
        display: 'flex', 
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        boxSizing: 'border-box',
        background: 'var(--bg)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0 0 3rem 0', paddingLeft: '0.5rem' }}>
          <img src={heroImg} alt="StackVest" className="brand-logo" style={{ width: '32px', height: 'auto' }} />
          <h2 style={{ margin: 0, color: 'var(--text-h)', fontSize: '1.25rem', letterSpacing: '-0.02em' }}>StackVest</h2>
        </div>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
          <NavLink 
            to="/dashboard/visualization"
            style={({ isActive }) => ({ 
              fontSize: '14px', 
              fontWeight: '500', 
              textDecoration: 'none',
              color: isActive ? 'var(--accent)' : 'var(--text)',
              background: isActive ? 'var(--accent-bg)' : 'transparent',
              padding: '10px 12px',
              borderRadius: '8px',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            })}
          >
            <span style={{ opacity: 0.7 }}>📊</span>
            Visualization
          </NavLink>
          <NavLink 
            to="/dashboard/dca"
            style={({ isActive }) => ({ 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: 'space-between',
              textDecoration: 'none',
              fontSize: '14px', 
              fontWeight: '500', 
              color: isActive ? 'var(--accent)' : 'var(--text)',
              background: isActive ? 'var(--accent-bg)' : 'transparent',
              padding: '10px 12px',
              borderRadius: '8px',
              transition: 'all 0.2s'
            })}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ opacity: 0.7 }}>⏳</span>
              <span>DCA Simulation</span>
            </div>
            <span style={{ 
              fontSize: '9px', 
              background: 'var(--accent-bg)', 
              padding: '2px 6px', 
              borderRadius: '4px', 
              textTransform: 'uppercase', 
              letterSpacing: '0.5px', 
              color: 'var(--accent)', 
              border: '1px solid var(--accent-border)',
              fontWeight: '600'
            }}>
              Beta
            </span>
          </NavLink>
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', padding: '0 0.5rem' }}>
            <img src={user?.picture} alt={user?.name} style={{ borderRadius: '50%', width: '36px', height: '36px', border: '1px solid var(--border)', background: 'var(--code-bg)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-h)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user?.name}</span>
              <span style={{ fontSize: '11px', opacity: 0.6, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user?.email}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="counter" style={{ width: '100%', justifyContent: 'center', marginBottom: 0 }}>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '3rem', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1 }}>
          <Outlet />
        </div>

        <div className="ticks"></div>

        <footer style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid var(--border)', textAlign: 'center', fontSize: '14px', opacity: 0.6 }}>
          <p>&copy; 2024 StackVest. All rights reserved.</p>
        </footer>
      </main>
    </div>
  );
};

export default LandingPage;
