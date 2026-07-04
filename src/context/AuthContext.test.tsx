import { render, screen } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

vi.mock('@react-oauth/google', () => ({
  useGoogleOneTapLogin: () => {},
}));

vi.mock('../api/users', () => ({
  getMe: vi.fn().mockResolvedValue(null),
  createMe: vi.fn(),
}));

function Consumer() {
  const { isAuthenticated } = useAuth();
  return <div>{isAuthenticated ? 'authed' : 'anon'}</div>;
}

afterEach(() => {
  vi.restoreAllMocks();
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
      render(
        <AuthProvider>
          <Consumer />
        </AuthProvider>
      )
    ).not.toThrow();

    expect(screen.getByText('anon')).toBeInTheDocument();
  });
});
