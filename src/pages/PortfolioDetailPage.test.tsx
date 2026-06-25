import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import PortfolioDetailPage from './PortfolioDetailPage';
import { usePortfolio } from '../hooks/usePortfolio';
import { usePortfolioPositionsById } from '../hooks/usePortfolioPositionsById';
import type { PortfolioPosition } from '../api/portfolio';

vi.mock('../hooks/usePortfolio', () => ({ usePortfolio: vi.fn() }));
vi.mock('../hooks/usePortfolioPositionsById', () => ({ usePortfolioPositionsById: vi.fn() }));
vi.mock('../hooks/useStockSearch', () => ({
  useStockSearch: () => ({ results: [], status: 'idle', error: null }),
}));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ token: 'test-token' }) }));
vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));
vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useParams: () => ({ id: 'p1' }) };
});

const mockedUsePortfolio = vi.mocked(usePortfolio);
const mockedUsePositions = vi.mocked(usePortfolioPositionsById);

function makePositions(n: number): PortfolioPosition[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `pos${i}`,
    symbol: `SYM${i}`,
    name: `Asset ${i}`,
    shares: 1,
    avgCost: 100,
    valueUsd: 100,
    change24h: 0,
    addedAt: '',
  }));
}

function renderPage() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/dashboard/portfolios/p1']}>
        <PortfolioDetailPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('PortfolioDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUsePortfolio.mockReturnValue({
      data: { id: 'p1', name: 'Tech Venture', description: 'x', createdAt: '', updatedAt: '' },
      status: 'success',
      error: null,
    } as unknown as ReturnType<typeof usePortfolio>);
  });

  it('disables "Add Asset" when the per-portfolio asset cap is reached', () => {
    mockedUsePositions.mockReturnValue({
      data: makePositions(20),
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof usePortfolioPositionsById>);
    renderPage();

    expect(screen.getByRole('button', { name: /add asset/i })).toBeDisabled();
    expect(screen.getByText('20 / 20')).toBeInTheDocument();
  });

  it('enables "Add Asset" below the cap', () => {
    mockedUsePositions.mockReturnValue({
      data: makePositions(3),
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof usePortfolioPositionsById>);
    renderPage();

    expect(screen.getByRole('button', { name: /add asset/i })).toBeEnabled();
  });
});
