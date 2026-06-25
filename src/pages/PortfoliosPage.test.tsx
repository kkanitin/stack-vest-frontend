import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import PortfoliosPage from './PortfoliosPage';
import { usePortfolios } from '../hooks/usePortfolios';
import { usePortfoliosSummary } from '../hooks/usePortfoliosSummary';
import type { Portfolio } from '../api/portfolios';

vi.mock('../hooks/usePortfolios', () => ({ usePortfolios: vi.fn() }));
vi.mock('../hooks/usePortfoliosSummary', () => ({ usePortfoliosSummary: vi.fn() }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ token: 'test-token' }) }));
vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));

const mockedUsePortfolios = vi.mocked(usePortfolios);
const mockedUseSummary = vi.mocked(usePortfoliosSummary);

function makeList(n: number): Portfolio[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `Portfolio ${i}`,
    description: '',
    createdAt: '',
    updatedAt: '',
  }));
}

function setPortfolios(list: Portfolio[]) {
  mockedUsePortfolios.mockReturnValue({
    data: list,
    status: 'success',
    error: null,
  } as unknown as ReturnType<typeof usePortfolios>);
}

function renderPage() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <PortfoliosPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('PortfoliosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseSummary.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as unknown as ReturnType<typeof usePortfoliosSummary>);
  });

  it('shows the active-count over the configured maximum (NN / 10)', () => {
    setPortfolios(makeList(2));
    renderPage();

    const value = screen.getByText(
      (_content, el) =>
        el?.className === 'pf-stat-value' &&
        el.textContent?.replace(/\s+/g, ' ').trim() === '02 / 10'
    );
    expect(value).toBeInTheDocument();
  });

  it('disables the create controls when the portfolio limit is reached', () => {
    setPortfolios(makeList(10));
    renderPage();

    expect(screen.getByRole('button', { name: /new portfolio/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /portfolio limit reached/i })).toBeDisabled();
  });

  it('enables the create card below the limit', () => {
    setPortfolios(makeList(3));
    renderPage();

    expect(screen.getByRole('button', { name: /create new portfolio/i })).toBeEnabled();
  });
});
