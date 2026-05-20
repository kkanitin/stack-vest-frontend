import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, NavLink, Outlet } from 'react-router-dom';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import './LandingPage.css';

// Lightweight monoline glyphs (Lucide-style strokes) — kept inline to avoid
// pulling an icon library for four sidebar items.
const Icon: Record<string, React.FC<{ size?: number }>> = {
  Overview: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" />
      <rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" />
      <rect x="3" y="16" width="7" height="5" />
    </svg>
  ),
  Heatmap: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="3" width="6" height="6" />
      <rect x="11" y="3" width="6" height="6" />
      <rect x="3" y="11" width="6" height="6" />
      <rect x="11" y="11" width="6" height="6" />
    </svg>
  ),
  DCA: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l5-5 4 4 8-9" />
      <path d="M14 7h6v6" />
    </svg>
  ),
  Watchlist: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M3 12h18M3 18h12" />
    </svg>
  ),
  Calendar: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  ),
  Plus: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  Logo: ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M4 10l8-6 8 6" />
      <path d="M5 10v8M19 10v8M9 10v8M15 10v8" />
    </svg>
  ),
};

const LandingPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNewSimulation = () => {
    setSidebarOpen(false);
    navigate('/dashboard/dca');
  };

  return (
    <>
      <div className="layout">
        <aside className={`sidebar${sidebarOpen ? ' sidebar--open' : ''}`}>
          <div className="sidebar-head">
            <div className="sidebar-brand">
              <span className="sidebar-brand-mark"><Icon.Logo size={22} /></span>
              <div className="sidebar-brand-text">
                <div className="sidebar-brand-name">StackVest</div>
                <div className="sidebar-brand-sub">Premium Portfolio</div>
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
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sidebar-link-icon"><Icon.Overview /></span>
              Overview
            </NavLink>
            <NavLink
              to="/dashboard/visualization/heatmap"
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sidebar-link-icon"><Icon.Heatmap /></span>
              Heatmap
            </NavLink>
            <NavLink
              to="/dashboard/dca"
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sidebar-link-icon"><Icon.DCA /></span>
              DCA Simulation
              <Badge tone="primary" pill className="sidebar-link-badge">Beta</Badge>
            </NavLink>
            <NavLink
              to="/dashboard/watchlist"
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sidebar-link-icon"><Icon.Watchlist /></span>
              Watchlist
            </NavLink>
          </nav>

          <div className="sidebar-foot">
            <Button variant="primary" block onClick={handleNewSimulation} className="sidebar-cta">
              <Icon.Plus /> New Simulation
            </Button>

            <div className="sidebar-foot-links">
              <button className="sidebar-foot-link" type="button">Settings</button>
              <button className="sidebar-foot-link" type="button" onClick={handleLogout}>Log out</button>
            </div>
          </div>
        </aside>

        <main className="main">
          <div className="main-topbar">
            <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open menu">☰</button>
            <span className="main-topbar-brand">StackVest</span>
            <div className="main-topbar-right">
              <button className="topbar-icon-btn" aria-label="Calendar">
                <Icon.Calendar />
              </button>
              {user?.picture && (
                <img src={user.picture} alt={user.name ?? 'User'} className="topbar-avatar" />
              )}
            </div>
          </div>

          <div className="main-content">
            <Outlet />
          </div>

          <footer className="main-footer">
            <span className="main-footer-copy">StackVest Institutional v2.4</span>
            <span className="main-footer-links">
              <span className="footer-status">
                <span className="live-dot" />
                System Status
              </span>
              <a href="#" className="footer-link">API Docs</a>
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
