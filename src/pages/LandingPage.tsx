import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, NavLink, Outlet } from 'react-router-dom';
import heroImg from '../assets/hero.png';
import './LandingPage.css';

const LandingPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <>
      <div className="layout">
        <aside className={`sidebar${sidebarOpen ? ' sidebar--open' : ''}`}>
          <div className="sidebar-head">
            <div className="sidebar-brand">
              <img src={heroImg} alt="StackVest" className="brand-logo" style={{ width: 28, height: 'auto', filter: 'invert(1) brightness(0.9)' }} />
              <div>
                <div className="sidebar-brand-name">StackVest</div>
                <div className="sidebar-brand-sub">Portfolio</div>
              </div>
              <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu">✕</button>
            </div>
          </div>

          <nav className="sidebar-nav">
            <div className="sidebar-nav-label">Workspace</div>
            <NavLink
              to="/dashboard/visualization"
              end
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <em className="sidebar-link-icon">📊</em>
              Visualization
            </NavLink>
            <NavLink
              to="/dashboard/visualization/heatmap"
              className={({ isActive }) => `sidebar-sublink${isActive ? ' active' : ''}`}
            >
              <em className="sidebar-link-icon" style={{ fontSize: 11 }}>🟥</em>
              Heatmap
            </NavLink>
            <NavLink
              to="/dashboard/dca"
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <em className="sidebar-link-icon">⏳</em>
              DCA Simulation
              <span className="sidebar-badge">Beta</span>
            </NavLink>
            <NavLink
              to="/dashboard/watchlist"
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <em className="sidebar-link-icon">📋</em>
              Watchlist
            </NavLink>
          </nav>

          <div className="sidebar-foot">
            <div className="sidebar-user">
              <img src={user?.picture} alt={user?.name} className="sidebar-avatar" />
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{user?.name}</div>
                <div className="sidebar-user-email">{user?.email}</div>
              </div>
            </div>
            <button onClick={handleLogout} className="counter" style={{ width: '100%', justifyContent: 'center' }}>
              Sign Out
            </button>
          </div>
        </aside>

        <main className="main">
          <div className="main-topbar">
            <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open menu">☰</button>
            <span className="main-topbar-left">Dashboard</span>
            <span className="main-topbar-date">{today}</span>
          </div>

          <div className="main-content">
            <Outlet />
          </div>

          <footer className="main-footer">
            <span className="main-footer-copy">© 2026 StackVest. All rights reserved.</span>
            <span className="main-footer-live">
              <span className="live-dot" />
              Live data
            </span>
          </footer>
        </main>
      </div>
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}
    </>
  );
};

export default LandingPage;
