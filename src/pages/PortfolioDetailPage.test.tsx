import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import PortfolioDetailPage from './PortfolioDetailPage';
import { usePortfolio } from '../hooks/usePortfolio';
import { usePortfolioPositionsById } from '../hooks/usePortfolioPositionsById';
import { removePortfolioPosition } from '../api/portfolios';
import type { PortfolioPosition } from '../api/portfolio';

vi.mock('../hooks/usePortfolio', () => ({ usePortfolio: vi.fn() }));
vi.mock('../hooks/usePortfolioPositionsById', () => ({ usePortfolioPositionsById: vi.fn() }));
vi.mock('../api/portfolios', async importActual => {
  const actual = await importActual<typeof import('../api/portfolios')>();
  return {
    ...actual,
    deletePortfolio: vi.fn(),
    removePortfolioPosition: vi.fn().mockResolvedValue(undefined),
  };
});
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
const mockedRemovePosition = vi.mocked(removePortfolioPosition);

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
    expect(screen.getByText('/ 20 Slots Used')).toBeInTheDocument();
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

  it('removes a position via the portfolio-scoped endpoint when confirmed', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockedUsePositions.mockReturnValue({
      data: makePositions(2),
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof usePortfolioPositionsById>);
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /delete SYM0 position/i }));

    await waitFor(() =>
      expect(mockedRemovePosition).toHaveBeenCalledWith('test-token', 'p1', 'SYM0')
    );
    confirmSpy.mockRestore();
  });

  it('does not call the API when the confirmation is dismissed', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    mockedUsePositions.mockReturnValue({
      data: makePositions(2),
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof usePortfolioPositionsById>);
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /delete SYM0 position/i }));

    expect(mockedRemovePosition).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
