/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import { getMe, createMe } from '../api/users';
import type { User } from '../api/users';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (credential: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isInitializing: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** True only when `token` is a JWT whose `exp` claim is still in the future. */
function isTokenValid(token: string | null): token is string {
  if (!token) return false;
  try {
    const { exp } = jwtDecode<{ exp?: number }>(token);
    return typeof exp === 'number' && exp * 1000 > Date.now();
  } catch {
    return false;
  }
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
