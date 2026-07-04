import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage';

const loginMock = vi.fn();

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login: loginMock, isAuthenticated: false, isInitializing: false }),
}));

vi.mock('@react-oauth/google', () => ({
  GoogleLogin: ({ onSuccess }: { onSuccess: (r: { credential?: string }) => void }) => (
    <button onClick={() => onSuccess({ credential: undefined })}>mock-google-login</button>
  ),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows an error and does not call login when Google returns no credential', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'mock-google-login' }));

    expect(await screen.findByText(/sign-in failed/i)).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });
});
