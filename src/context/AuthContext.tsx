/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useGoogleOneTapLogin } from '@react-oauth/google';
import type { CredentialResponse } from '@react-oauth/google';
import { useQueryClient } from '@tanstack/react-query';
import { getMe, createMe, AuthError } from '../api/users';
import type { User } from '../api/users';

/**
 * Attempt a silent token renewal this long before the token's `exp`. The
 * `GoogleLogin`/One Tap credential flow never issues a refresh token, so the
 * only frontend-only way to avoid a hard logout is to ask Google Identity
 * Services to re-issue a fresh ID token (`auto_select`) while the user's Google
 * session is still alive. This is best-effort: when silent renewal is not
 * possible (no Google session, third-party cookies/FedCM blocked), the current
 * token is left to run out on its own — the user isn't logged out until it
 * actually expires (see `handleRenewFailed`).
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

/**
 * Decodes the JWT payload only — does not verify the signature. This is an
 * intentional, low-risk tradeoff: the backend independently verifies the
 * token's signature on every real API call, and the background getMe()
 * revalidation effect below reconciles any drift. This check exists purely to
 * gate client-side UX (cached-session hydration, renewal scheduling) and can
 * never grant real data access on its own.
 */
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

/** Clears any persisted session from localStorage. */
function clearStoredSession(): void {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
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
  try {
    clearStoredSession();
  } catch {
    // storage inaccessible — nothing to clear, proceed logged-out
  }
  return { user: null, token: null };
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Read from context rather than importing the client from App.tsx — App.tsx
  // imports this module, so a direct import would be a circular dependency.
  // QueryClientProvider is mounted above AuthProvider, so the hook resolves.
  const queryClient = useQueryClient();
  // Hydrate from cache up front so authenticated routes can paint immediately.
  const [{ user: cachedUser, token: cachedToken }] = useState(readCachedSession);
  const [user, setUser] = useState<User | null>(cachedUser);
  const [token, setToken] = useState<string | null>(cachedToken);
  // Only block first render when there is no usable cached session to show.
  const [isInitializing, setIsInitializing] = useState(!cachedToken);
  // When true, the One Tap hook below silently re-issues a fresh ID token.
  const [renewing, setRenewing] = useState(false);
  // Guards renewal callbacks against firing after an explicit logout. A ref
  // (not state) is required: the Google SDK's callback can resolve after a
  // logout has already happened, and a ref's `.current` is always read live
  // at call time regardless of which render's closure ends up invoked.
  const loggedOutRef = useRef(false);
  // Hard logout scheduled for the current token's real expiry. Armed for every
  // token by the token-keyed effect below, not only when renewal fails.
  const expiryLogoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearExpiryLogoutTimer = () => {
    if (expiryLogoutTimerRef.current) {
      clearTimeout(expiryLogoutTimerRef.current);
      expiryLogoutTimerRef.current = null;
    }
  };
  useEffect(() => clearExpiryLogoutTimer, []);

  // A renewed credential keeps the session alive without a redirect. We update
  // only the token — `user` is the backend record from getMe(), not the Google
  // profile, so it must not be overwritten by the decoded credential.
  const handleRenewed = (resp: CredentialResponse) => {
    setRenewing(false);
    if (loggedOutRef.current) return; // logged out while a renewal was in flight
    if (!resp.credential) {
      handleRenewFailed();
      return;
    }
    setToken(resp.credential);
    localStorage.setItem('token', resp.credential);
    // The token-keyed effect below rearms both timers automatically.
  };

  // Silent renewal isn't possible right now (no live Google session, FedCM/
  // third-party cookies blocked, etc). Nothing to do: the current token is
  // left to run out on its own, and the hard-expiry logout armed by the
  // token-keyed effect below fires when it actually expires. Deliberately does
  // not read `token` — that closure can be stale when a renewal callback
  // resolves late, and the effect already owns the authoritative expiry.
  const handleRenewFailed = () => {
    setRenewing(false);
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

  // Arm both timers for the current token: a silent renewal shortly before it
  // expires, and a hard logout at the real expiry. The hard logout is armed
  // unconditionally — it previously lived only in the renewal-failure path, so
  // a One Tap prompt the user simply ignored (which fires no callback at all
  // under `cancel_on_tap_outside: false`) left the session authenticated long
  // past the token's expiry, since `isAuthenticated` derives from `user`, not
  // from token validity. Re-runs whenever the token changes (login or a
  // successful renewal), so each fresh token arms the next cycle.
  useEffect(() => {
    if (!token) return;
    const expMs = getTokenExpMs(token);
    if (expMs === null) return;

    const untilExpiry = expMs - Date.now();
    if (untilExpiry <= 0) {
      logout();
      return;
    }

    clearExpiryLogoutTimer();
    expiryLogoutTimerRef.current = setTimeout(() => {
      if (!loggedOutRef.current) logout();
    }, untilExpiry);

    const renewDelay = untilExpiry - RENEW_BUFFER_MS;
    if (renewDelay <= 0) {
      setRenewing(true);
      return clearExpiryLogoutTimer;
    }
    const renewTimer = setTimeout(() => setRenewing(true), renewDelay);
    return () => {
      clearTimeout(renewTimer);
      clearExpiryLogoutTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!cachedToken) {
      setIsInitializing(false);
      return;
    }
    // Background revalidation: confirm the cached token is still accepted by the
    // server and refresh the user. A token the server rejects logs the user out.
    let cancelled = false;
    (async () => {
      try {
        const freshUser = await getMe(cachedToken);
        if (cancelled) return;
        if (freshUser) {
          setUser(freshUser);
          localStorage.setItem('user', JSON.stringify(freshUser));
        } else {
          // Confirmed 404 — the token is fine, there is just no user record.
          logout();
        }
      } catch (e) {
        if (cancelled) return;
        // A rejected token (expired, revoked, wrong audience) is the one case
        // where the cached session is provably dead. Anything else — offline,
        // DNS, CORS, a 5xx — keeps the optimistic session rather than punting
        // the user to the login screen over a transient failure.
        if (e instanceof AuthError) logout();
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
    loggedOutRef.current = false;
    const userData = (await getMe(credential)) ?? (await createMe(credential));

    setUser(userData);
    setToken(credential);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', credential);
  };

  const logout = () => {
    loggedOutRef.current = true;
    clearExpiryLogoutTimer();
    setRenewing(false);
    setUser(null);
    setToken(null);
    clearStoredSession();
    // Every query key here is user-agnostic (['portfolios'], ['watchlist'], …),
    // and signing out does not reload the page, so without this the next
    // account to sign in inside this tab would be served the previous
    // account's cached data from staleTime before its own refetch resolves.
    // Cleared after setToken(null) so no in-flight refetch can repopulate it.
    queryClient.clear();
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
