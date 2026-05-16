import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import type { CredentialResponse } from '@react-oauth/google';
import './LoginPage.css';

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
  );
};

export default LoginPage;
