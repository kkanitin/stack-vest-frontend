import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, NavLink, Outlet } from 'react-router-dom';
import heroImg from '../assets/hero.png';

const S = `
  .layout{display:flex;min-height:100vh;}
  .sidebar{width:260px;flex-shrink:0;background:var(--sidebar-bg);display:flex;flex-direction:column;position:sticky;top:0;height:100vh;box-sizing:border-box;border-right:3px solid #000;}
  .sidebar-head{padding:28px 24px 0;border-bottom:1px solid rgba(255,255,255,.07);padding-bottom:24px;}
  .sidebar-brand{display:flex;align-items:center;gap:10px;margin-bottom:0;}
  .sidebar-brand-name{font-family:'Bebas Neue',impact,sans-serif;font-size:22px;letter-spacing:.06em;color:#fff;line-height:1;}
  .sidebar-brand-sub{font-size:9px;font-weight:500;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.25);margin-top:2px;}
  .sidebar-nav{flex:1;padding:20px 16px;display:flex;flex-direction:column;gap:2px;}
  .sidebar-nav-label{font-size:9px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.2);padding:0 8px;margin:0 0 8px;}
  .sidebar-link{display:flex;align-items:center;gap:10px;padding:9px 10px;font-size:13px;font-weight:500;text-decoration:none;color:rgba(255,255,255,.45);transition:all .15s;position:relative;letter-spacing:.01em;}
  .sidebar-link:hover{color:rgba(255,255,255,.8);}
  .sidebar-link.active{color:#fff;background:rgba(255,255,255,.06);}
  .sidebar-link.active::before{content:'';position:absolute;left:0;top:6px;bottom:6px;width:2px;background:var(--accent);}
  .sidebar-link-icon{opacity:.6;font-style:normal;font-size:14px;}
  .sidebar-link.active .sidebar-link-icon{opacity:1;}
  .sidebar-badge{margin-left:auto;font-size:8px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:2px 6px;background:rgba(220,38,38,.15);color:var(--accent);border:1px solid rgba(220,38,38,.25);}
  .sidebar-sublink{display:flex;align-items:center;gap:10px;padding:7px 10px 7px 32px;font-size:12px;font-weight:500;text-decoration:none;color:rgba(255,255,255,.35);transition:all .15s;position:relative;letter-spacing:.01em;}
  .sidebar-sublink:hover{color:rgba(255,255,255,.7);}
  .sidebar-sublink.active{color:rgba(255,255,255,.9);}
  .sidebar-sublink.active::before{content:'';position:absolute;left:16px;top:6px;bottom:6px;width:2px;background:var(--accent);}
  .sidebar-foot{padding:20px 16px;border-top:1px solid rgba(255,255,255,.07);}
  .sidebar-user{display:flex;align-items:center;gap:10px;margin-bottom:14px;padding:0 2px;}
  .sidebar-avatar{width:34px;height:34px;border-radius:50%;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);flex-shrink:0;object-fit:cover;}
  .sidebar-user-info{overflow:hidden;flex:1;}
  .sidebar-user-name{font-size:12px;font-weight:600;color:rgba(255,255,255,.85);white-space:nowrap;text-overflow:ellipsis;overflow:hidden;}
  .sidebar-user-email{font-size:10px;color:rgba(255,255,255,.3);white-space:nowrap;text-overflow:ellipsis;overflow:hidden;}
  .main{flex:1;background:var(--bg);display:flex;flex-direction:column;min-width:0;}
  .main-topbar{padding:20px 40px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
  .main-topbar-left{font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--text);opacity:.6;}
  .main-topbar-date{font-size:11px;color:var(--text);opacity:.5;font-family:var(--mono);}
  .main-content{flex:1;padding:40px;}
  .main-footer{padding:24px 40px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
  .main-footer-copy{font-size:11px;color:var(--text);opacity:.45;letter-spacing:.04em;}
  .main-footer-live{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text);opacity:.5;letter-spacing:.04em;}
  .live-dot{width:5px;height:5px;border-radius:50%;background:var(--success);animation:livepulse 2s ease-in-out infinite;}
  @keyframes livepulse{0%,100%{opacity:1}50%{opacity:.3}}
  .hamburger{display:none;align-items:center;justify-content:center;background:transparent;border:1px solid var(--border);padding:6px 10px;cursor:pointer;border-radius:8px;color:var(--text-h);font-size:18px;line-height:1;transition:border-color 150ms;}
  .hamburger:hover{border-color:var(--text-h);}
  .sidebar-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:199;}
  .sidebar-close{display:none;align-items:center;justify-content:center;background:transparent;border:1px solid rgba(255,255,255,.15);border-radius:6px;padding:4px 8px;cursor:pointer;color:rgba(255,255,255,.6);font-size:18px;line-height:1;margin-left:auto;transition:all 150ms;}
  .sidebar-close:hover{color:#fff;border-color:rgba(255,255,255,.35);}
  @media(max-width:1024px){
    .sidebar{position:fixed;top:0;left:0;height:100%;z-index:200;transform:translateX(-260px);transition:transform 200ms cubic-bezier(0.4,0,0.2,1);}
    .sidebar--open{transform:translateX(0);}
    .main-content{padding:clamp(1rem,4vw,2.5rem);}
    .main-topbar{padding:16px clamp(1rem,4vw,2.5rem);}
    .main-footer{padding:16px clamp(1rem,4vw,2.5rem);}
    .hamburger{display:flex;}
    .sidebar-close{display:flex;}
  }
`;

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
      <style>{S}</style>
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
