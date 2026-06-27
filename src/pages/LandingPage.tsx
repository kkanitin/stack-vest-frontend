import React, { useState, Suspense } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ErrorBoundary from '../components/ErrorBoundary';
import RouteFallback from '../components/RouteFallback';
import TopbarSearch from '../components/TopbarSearch';
import AssetDetailModal from '../components/AssetDetailModal';
import DividendScheduleModal from '../components/DividendScheduleModal';
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
  Portfolios: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="14" rx="2" />
      <path d="M16 6V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v1" />
      <path d="M2 12h20" />
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
      <rect x="3" y="12" width="4" height="9" />
      <rect x="10" y="7" width="4" height="14" />
      <rect x="17" y="3" width="4" height="18" />
    </svg>
  ),
  Watchlist: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  Plus: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  Calendar: ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M8 2v4M16 2v4M3 10h18" />
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
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [detailSymbol, setDetailSymbol] = useState<string | null>(null);
  const [dividendOpen, setDividendOpen] = useState(false);

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
                <div className="sidebar-brand-sub">Personal Portfolio</div>
              </div>
              <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu">✕</button>
            </div>
          </div>

          <nav className="sidebar-nav">
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
              to="/dashboard/portfolios"
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sidebar-link-icon"><Icon.Portfolios /></span>
              Portfolios
            </NavLink>
            <div className="sidebar-nav-label sidebar-section-label">Visualization</div>
            <NavLink
              to="/dashboard/visualization/heatmap"
              className={({ isActive }) => `sidebar-link sidebar-link--child${isActive ? ' active' : ''}`}
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
              <button className="sidebar-foot-link" type="button" onClick={handleLogout}>Log out</button>
            </div>
          </div>
        </aside>

        <main className="main">
          <div className="main-topbar">
            <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open menu">☰</button>
            <span className="main-topbar-brand">StackVest</span>
            <div className="main-topbar-right">
              <button
                className="topbar-icon-btn"
                onClick={() => setDividendOpen(true)}
                aria-label="Dividend schedule"
              >
                <Icon.Calendar />
              </button>
              <TopbarSearch onSelect={setDetailSymbol} />
              {user?.picture && (
                <img src={user.picture} alt={user.name ?? 'User'} className="topbar-avatar" />
              )}
            </div>
          </div>

          <div className="main-content">
            <ErrorBoundary key={location.pathname} variant="inline">
              <Suspense fallback={<RouteFallback variant="inline" />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </div>

          <footer className="main-footer">
            <span className="main-footer-copy">StackVest Personal</span>
            <span className="main-footer-links">
              <span className="footer-status">
                <span className="live-dot" />
                Service Status
              </span>
              <a href="#" className="footer-link">Documentation</a>
            </span>
          </footer>
        </main>
      </div>
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}
      <AssetDetailModal symbol={detailSymbol} onClose={() => setDetailSymbol(null)} />
      <DividendScheduleModal open={dividendOpen} onClose={() => setDividendOpen(false)} />
    </>
  );
};

export default LandingPage;
