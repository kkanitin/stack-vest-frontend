/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useGoogleOneTapLogin } from '@react-oauth/google';
import type { CredentialResponse } from '@react-oauth/google';
import { getMe, createMe } from '../api/users';
import type { User } from '../api/users';

/**
 * Attempt a silent token renewal this long before the token's `exp`. The
 * `GoogleLogin`/One Tap credential flow never issues a refresh token, so the
 * only frontend-only way to avoid a hard logout is to ask Google Identity
 * Services to re-issue a fresh ID token (`auto_select`) while the user's Google
 * session is still alive. This is best-effort: when silent renewal is not
 * possible (no Google session, third-party cookies/FedCM blocked) we fall back
 * to the normal logout → /login redirect.
 */
const RENEW_BUFFER_MS = 2 * 60 * 1000;

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (credential: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isInitializing: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** The token's expiry as epoch milliseconds, or null if it can't be decoded. */
function getTokenExpMs(token: string | null): number | null {
  if (!token) return null;
  try {
    const { exp } = jwtDecode<{ exp?: number }>(token);
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

/** True only when `token` is a JWT whose `exp` claim is still in the future. */
function isTokenValid(token: string | null): token is string {
  const expMs = getTokenExpMs(token);
  return expMs !== null && expMs > Date.now();
}

/**
 * Synchronously read a previously cached session from localStorage. This lets
 * the app render the authenticated shell on first paint instead of waiting for
 * a `getMe()` round-trip — the dominant LCP/Speed-Index cost on the dashboard.
 * The cached token is still revalidated against the server in the background.
 */
function readCachedSession(): { user: User | null; token: string | null } {
  try {
    const token = localStorage.getItem('token');
    const rawUser = localStorage.getItem('user');
    if (isTokenValid(token) && rawUser) {
      return { user: JSON.parse(rawUser) as User, token };
    }
  } catch {
    // fall through to cleared state
  }
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  return { user: null, token: null };
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Hydrate from cache up front so authenticated routes can paint immediately.
  const [{ user: cachedUser, token: cachedToken }] = useState(readCachedSession);
  const [user, setUser] = useState<User | null>(cachedUser);
  const [token, setToken] = useState<string | null>(cachedToken);
  // Only block first render when there is no usable cached session to show.
  const [isInitializing, setIsInitializing] = useState(!cachedToken);
  // When true, the One Tap hook below silently re-issues a fresh ID token.
  const [renewing, setRenewing] = useState(false);

  // A renewed credential keeps the session alive without a redirect. We update
  // only the token — `user` is the backend record from getMe(), not the Google
  // profile, so it must not be overwritten by the decoded credential.
  const handleRenewed = (resp: CredentialResponse) => {
    setRenewing(false);
    if (!resp.credential) {
      handleRenewFailed();
      return;
    }
    setToken(resp.credential);
    localStorage.setItem('token', resp.credential);
    // The token-keyed effect below reschedules the next renewal automatically.
  };

  // Silent renewal isn't possible — fall back to the normal logout/redirect.
  const handleRenewFailed = () => {
    setRenewing(false);
    logout();
  };

  useGoogleOneTapLogin({
    disabled: !renewing,
    auto_select: true,
    cancel_on_tap_outside: false,
    onSuccess: handleRenewed,
    onError: handleRenewFailed,
    promptMomentNotification: (n) => {
      // Suppressed/skipped without returning a credential => can't renew silently.
      if (n.isNotDisplayed() || n.isSkippedMoment()) handleRenewFailed();
    },
  });

  // Schedule a silent renewal shortly before the current token expires. Re-runs
  // whenever the token changes (login or a successful renewal), so each fresh
  // token arms the next cycle.
  useEffect(() => {
    if (!token) return;
    const expMs = getTokenExpMs(token);
    if (expMs === null) return;
    const delay = expMs - Date.now() - RENEW_BUFFER_MS;
    if (delay <= 0) {
      setRenewing(true);
      return;
    }
    const id = setTimeout(() => setRenewing(true), delay);
    return () => clearTimeout(id);
  }, [token]);

  useEffect(() => {
    if (!cachedToken) {
      setIsInitializing(false);
      return;
    }
    // Background revalidation: confirm the cached token is still accepted by the
    // server and refresh the user. An invalid/revoked token logs the user out.
    let cancelled = false;
    (async () => {
      try {
        const freshUser = await getMe(cachedToken);
        if (cancelled) return;
        if (freshUser) {
          setUser(freshUser);
          localStorage.setItem('user', JSON.stringify(freshUser));
        } else {
          logout();
        }
      } catch {
        // Network error: keep the optimistic session rather than logging out.
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (credential: string) => {
    const userData = (await getMe(credential)) ?? (await createMe(credential));

    setUser(userData);
    setToken(credential);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', credential);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!user, isInitializing }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
