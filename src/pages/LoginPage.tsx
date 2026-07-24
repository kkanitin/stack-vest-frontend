import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import type { CredentialResponse } from '@react-oauth/google';
import { useElementSize } from '../hooks/useElementSize';
import '../components/RouteFallback.css';
import './LoginPage.css';

const LogoMark: React.FC = () => (
  <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18" />
    <path d="M4 10l8-6 8 6" />
    <path d="M5 10v8M19 10v8M9 10v8M15 10v8" />
  </svg>
);

// The GSI button renders a real fixed-width iframe (no fluid/percentage option),
// so its width is measured from the wrapper and clamped instead of hardcoded.
const MIN_GOOGLE_BTN_WIDTH = 200;
const MAX_GOOGLE_BTN_WIDTH = 320;

const LoginPage: React.FC = () => {
  const { login, isAuthenticated, isInitializing } = useAuth();
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? '/dashboard';

  // `width` is passed straight into <GoogleLogin>, which is in that library's own
  // effect dependency array — every distinct value re-runs its init (and, with
  // useOneTap, cancels + re-prompts One Tap). A live drag-resize fires the observer
  // once per frame with a genuinely different width each time, so a 150ms debounce
  // keeps the button in sync with its container without re-initializing GSI on
  // every intermediate frame of a resize gesture.
  const [googleBtnWrapRef, googleBtnBox] = useElementSize<HTMLDivElement>({
    initialWidth: MAX_GOOGLE_BTN_WIDTH,
    debounceMs: 150,
  });
  const googleBtnWidth = Math.min(MAX_GOOGLE_BTN_WIDTH, Math.max(MIN_GOOGLE_BTN_WIDTH, Math.floor(googleBtnBox.width)));

  if (isInitializing) return null;
  if (isAuthenticated) return <Navigate to={from} replace />;

  const handleSuccess = async (r: CredentialResponse) => {
    setError(null);
    if (!r.credential) {
      setError('Sign-in failed. Please try again.');
      return;
    }
    setLoading(true);
    try {
      await login(r.credential);
      navigate(from, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  const handleError = () => setError('Sign-in failed. Ensure your account is registered.');

  return (
    <div className="lp">
      <div className="lp-card">
        <div className="lp-logo" aria-hidden>
          <LogoMark />
        </div>
        <h1 className="lp-title">StackVest</h1>
        <p className="lp-tagline">
          A personal investment portfolio tracker. Built for clarity, precision,
          and the calm pursuit of long-term growth.
        </p>

        <div className="lp-google-card">
          {error && <div className="lp-err">{error}</div>}

          {loading ? (
            <div className="lp-loading" role="status" aria-live="polite">
              <span className="rf-spinner" aria-hidden />
              <span>Signing in…</span>
            </div>
          ) : (
            <div className="lp-google-btn" ref={googleBtnWrapRef}>
              <GoogleLogin
                onSuccess={handleSuccess}
                onError={handleError}
                useOneTap
                theme="filled_black"
                shape="rectangular"
                size="large"
                text="continue_with"
                width={String(googleBtnWidth)}
              />
            </div>
          )}

          <p className="lp-google-sub">Simple, secure Google sign-in.</p>
        </div>

        <p className="lp-foot">
          Personal Side Project · <a href="#">Privacy Policy</a> · <a href="#">Terms of Service</a>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
