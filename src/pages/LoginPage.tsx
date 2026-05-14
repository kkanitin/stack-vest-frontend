import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import type { CredentialResponse } from '@react-oauth/google';

const S = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');
  .lp{flex:1;width:100%;display:grid;grid-template-columns:1fr 1fr;font-family:'DM Sans',sans-serif;overflow:hidden;}
  @media(max-width:768px){.lp{grid-template-columns:1fr;}}
  .lp-left{background:#111;padding:60px 56px;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden;}
  .lp-left::before{content:'';position:absolute;top:-80px;right:-80px;width:300px;height:300px;border-radius:50%;background:rgba(220,38,38,.12);filter:blur(60px);pointer-events:none;}
  .lp-left::after{content:'STACK VEST';position:absolute;bottom:-20px;left:-10px;font-family:'Bebas Neue',sans-serif;font-size:160px;color:rgba(255,255,255,.03);line-height:1;white-space:nowrap;letter-spacing:-.02em;pointer-events:none;}
  .lp-tag{display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border:1px solid rgba(220,38,38,.4);color:#dc2626;font-size:11px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;width:fit-content;}
  .lp-tag-dot{width:6px;height:6px;border-radius:50%;background:#dc2626;animation:lppulse 1.5s ease-in-out infinite;}
  @keyframes lppulse{0%,100%{opacity:1}50%{opacity:.3}}
  .lp-big{font-family:'Bebas Neue',sans-serif;font-size:clamp(64px,8vw,96px);line-height:.95;color:#fff;margin:32px 0;letter-spacing:.01em;}
  .lp-big em{color:#dc2626;font-style:normal;}
  .lp-desc{color:rgba(255,255,255,.35);font-size:14px;font-weight:300;line-height:1.7;max-width:280px;}
  .lp-issue{color:rgba(255,255,255,.15);font-size:11px;letter-spacing:.06em;text-transform:uppercase;}
  .lp-right{background:#f5f0eb;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;padding:60px 56px;position:relative;}
  @media(max-width:768px){.lp-left{min-height:55vh;}.lp-right{padding:48px 28px;}}
  .lp-right::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:#111;}
  .lp-eyebrow{font-size:11px;font-weight:500;letter-spacing:.16em;text-transform:uppercase;color:#aaa;margin-bottom:28px;}
  .lp-form-h{font-family:'Bebas Neue',sans-serif;font-size:52px;line-height:.95;color:#111;margin:0 0 6px;letter-spacing:.01em;}
  .lp-form-sub{font-size:14px;color:#777;font-weight:300;margin:0 0 40px;line-height:1.6;}
  .lp-divider{display:flex;align-items:center;gap:16px;margin-bottom:28px;width:100%;}
  .lp-divider-line{flex:1;height:1px;background:#d5cfc9;}
  .lp-divider-txt{font-size:11px;color:#bbb;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;}
  .lp-err{color:#dc2626;font-size:13px;padding:10px 14px;border-left:2px solid #dc2626;background:rgba(220,38,38,.05);margin-bottom:16px;width:100%;box-sizing:border-box;}
  .lp-fine{margin-top:24px;font-size:12px;color:#aaa;line-height:1.6;}
  .lp-fine a{color:#111;font-weight:500;text-decoration:none;border-bottom:1px solid #111;}
`;

const LoginPage: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const [error, setError] = React.useState<string | null>(null);
  const navigate = useNavigate();

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleSuccess = (r: CredentialResponse) => {
    setError(null);
    if (r.credential) { login(r.credential); navigate('/dashboard'); }
  };
  const handleError = () => setError('Sign-in failed. Ensure your account is registered.');

  return (
    <>
      <style>{S}</style>
      <div className="lp">
        <div className="lp-left">
          <div>
            <div className="lp-tag">
              <span className="lp-tag-dot" />
              Live Platform
            </div>
            <div className="lp-big">
              INVEST<br /><em>SMARTER</em><br />TODAY
            </div>
            <p className="lp-desc">
              Real-time portfolio analytics and DCA simulation for the modern investor.
            </p>
          </div>
          <div className="lp-issue">Vol. 2026 / Issue 01 — StackVest</div>
        </div>

        <div className="lp-right">
          <div className="lp-eyebrow">Member Access</div>
          <h1 className="lp-form-h">SIGN<br />IN</h1>
          <p className="lp-form-sub">Access your portfolio dashboard</p>

          <div className="lp-divider">
            <div className="lp-divider-line" />
            <span className="lp-divider-txt">Continue with</span>
            <div className="lp-divider-line" />
          </div>

          {error && <div className="lp-err">{error}</div>}

          <GoogleLogin onSuccess={handleSuccess} onError={handleError} useOneTap />

          <p className="lp-fine">
            By signing in you agree to our <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
