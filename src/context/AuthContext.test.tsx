import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { getMe, AuthError } from '../api/users';

vi.mock('@react-oauth/google', () => ({
  useGoogleOneTapLogin: () => {},
}));

vi.mock('../api/users', async () => {
  // AuthError must be the real class — AuthContext branches on `instanceof`.
  const actual = await vi.importActual<typeof import('../api/users')>('../api/users');
  return {
    AuthError: actual.AuthError,
    getMe: vi.fn().mockResolvedValue(null),
    createMe: vi.fn(),
  };
});

const getMeMock = vi.mocked(getMe);

/** A structurally valid JWT whose only meaningful claim is `exp`. */
function tokenExpiringIn(ms: number): string {
  const payload = btoa(JSON.stringify({ exp: Math.floor((Date.now() + ms) / 1000) }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `header.${payload}.signature`;
}

function renderWithClient(ui: ReactNode, queryClient = new QueryClient()) {
  return {
    queryClient,
    ...render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>),
  };
}

function Consumer() {
  const { isAuthenticated, logout } = useAuth();
  return (
    <>
      <div>{isAuthenticated ? 'authed' : 'anon'}</div>
      <button onClick={logout}>sign out</button>
    </>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  getMeMock.mockReset().mockResolvedValue(null);
});

describe('AuthProvider', () => {
  it('does not crash on mount when localStorage access throws (e.g. blocked storage)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });

    expect(() =>
      renderWithClient(
        <AuthProvider>
          <Consumer />
        </AuthProvider>
      )
    ).not.toThrow();

    expect(screen.getByText('anon')).toBeInTheDocument();
  });

  it('clears the React Query cache on logout so the next account cannot read it', async () => {
    const queryClient = new QueryClient();
    // Query keys are user-agnostic (['portfolios'], ['watchlist'], …), so
    // anything left here would be served to whoever signs in next in this tab.
    queryClient.setQueryData(['portfolios'], [{ id: 'p1', name: "first account's portfolio" }]);

    renderWithClient(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
      queryClient
    );

    expect(queryClient.getQueryData(['portfolios'])).toBeDefined();

    screen.getByRole('button', { name: 'sign out' }).click();

    await waitFor(() => {
      expect(queryClient.getQueryData(['portfolios'])).toBeUndefined();
    });
  });

  it('drops a cached session when the server rejects the token', async () => {
    localStorage.setItem('token', tokenExpiringIn(60 * 60 * 1000));
    localStorage.setItem('user', JSON.stringify({ id: '1', name: 'A', email: 'a@b.com', picture: '' }));
    getMeMock.mockRejectedValue(new AuthError());

    renderWithClient(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByText('anon')).toBeInTheDocument());
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('keeps a cached session when revalidation fails for a non-auth reason', async () => {
    localStorage.setItem('token', tokenExpiringIn(60 * 60 * 1000));
    localStorage.setItem('user', JSON.stringify({ id: '1', name: 'A', email: 'a@b.com', picture: '' }));
    getMeMock.mockRejectedValue(new Error('Unable to reach the server.'));

    renderWithClient(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(getMeMock).toHaveBeenCalled());
    expect(screen.getByText('authed')).toBeInTheDocument();
    expect(localStorage.getItem('token')).not.toBeNull();
  });

  it('logs out on its own when the token expires, with no renewal callback', async () => {
    vi.useFakeTimers();
    try {
      localStorage.setItem('token', tokenExpiringIn(5 * 60 * 1000));
      localStorage.setItem('user', JSON.stringify({ id: '1', name: 'A', email: 'a@b.com', picture: '' }));
      // Revalidation must SUCCEED here. With the default null resolution the
      // 404 branch logs out on its own and this test would pass without any
      // timer at all — i.e. it would pass against the pre-fix code too.
      getMeMock.mockResolvedValue({ id: '1', name: 'A', email: 'a@b.com', picture: '' });

      renderWithClient(
        <AuthProvider>
          <Consumer />
        </AuthProvider>
      );

      expect(screen.getByText('authed')).toBeInTheDocument();

      // Past expiry. One Tap never fires a callback here — the hard-expiry
      // timer is what has to end the session.
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 1000);

      expect(screen.getByText('anon')).toBeInTheDocument();
      expect(localStorage.getItem('token')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
