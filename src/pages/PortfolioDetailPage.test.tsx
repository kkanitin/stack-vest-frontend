import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import PortfolioDetailPage from './PortfolioDetailPage';
import { usePortfolio } from '../hooks/usePortfolio';
import { usePortfolioPositionsById } from '../hooks/usePortfolioPositionsById';
import { useClosedPositions } from '../hooks/useClosedPositions';
import { usePortfolioTransactions } from '../hooks/usePortfolioTransactions';
import { removePortfolioPosition } from '../api/portfolios';
import type { PortfolioPosition } from '../api/portfolio';

vi.mock('../hooks/usePortfolio', () => ({ usePortfolio: vi.fn() }));
vi.mock('../hooks/usePortfolioPositionsById', () => ({ usePortfolioPositionsById: vi.fn() }));
vi.mock('../hooks/useClosedPositions', () => ({ useClosedPositions: vi.fn() }));
vi.mock('../hooks/usePortfolioTransactions', () => ({ usePortfolioTransactions: vi.fn() }));
vi.mock('../hooks/useHoldingTransactions', () => ({
  useHoldingTransactions: () => ({ data: [], isLoading: false, isError: false }),
}));
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
vi.mock('react-router', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useParams: () => ({ id: 'p1' }) };
});

const mockedUsePortfolio = vi.mocked(usePortfolio);
const mockedUsePositions = vi.mocked(usePortfolioPositionsById);
const mockedUseClosed = vi.mocked(useClosedPositions);
const mockedUseTx = vi.mocked(usePortfolioTransactions);
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
    costBasis: 0,
    unrealisedPnl: 0,
    unrealisedPnlPct: 0,
    realisedPnl: 0,
    closed: false,
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
    mockedUseClosed.mockReturnValue({ data: [] } as unknown as ReturnType<typeof useClosedPositions>);
    mockedUseTx.mockReturnValue({
      data: { transactions: [] },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof usePortfolioTransactions>);
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

  it('shows a flat day as neutral: unsigned and without the gain colour', () => {
    mockedUsePositions.mockReturnValue({
      data: makePositions(2),
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof usePortfolioPositionsById>);
    const { container } = renderPage();

    expect(screen.getByText('(0.00%)')).toBeInTheDocument();
    expect(container.querySelector('.pfd-perf--pos')).toBeNull();
    expect(container.querySelector('.pfd-perf--neg')).toBeNull();
  });

  it('colours a losing day as a loss', () => {
    mockedUsePositions.mockReturnValue({
      data: makePositions(2).map(p => ({ ...p, change24h: -5 })),
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof usePortfolioPositionsById>);
    const { container } = renderPage();

    expect(container.querySelector('.pfd-perf--neg')).not.toBeNull();
    expect(screen.getByText('(-5.00%)')).toBeInTheDocument();
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

  it('warns in the delete confirmation that the history goes too', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    mockedUsePositions.mockReturnValue({
      data: makePositions(1),
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof usePortfolioPositionsById>);
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /delete SYM0 position/i }));
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringMatching(/transaction history/i));
    confirmSpy.mockRestore();
  });

  it('shows realised (including closed holdings) and unrealised P&L cards', () => {
    mockedUsePositions.mockReturnValue({
      data: makePositions(2).map(p => ({ ...p, costBasis: 100, unrealisedPnl: 25, realisedPnl: 10 })),
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof usePortfolioPositionsById>);
    mockedUseClosed.mockReturnValue({
      data: [{ ...makePositions(1)[0], symbol: 'OLD', shares: 0, closed: true, realisedPnl: 31 }],
    } as unknown as ReturnType<typeof useClosedPositions>);
    renderPage();

    // Unrealised: 25 + 25 on a cost of 200. Realised: 10 + 10 + 31 (closed).
    expect(screen.getByText('+$50.00')).toBeInTheDocument();
    expect(screen.getByText('+25.00% on cost')).toBeInTheDocument();
    expect(screen.getByText('+$51.00')).toBeInTheDocument();
    expect(screen.getByText('Realised P&L', { selector: '[data-slot="card-title"]' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /closed holdings/i })).toHaveTextContent('OLD');
  });

  it('lists portfolio transactions with an opening-balance label', () => {
    mockedUsePositions.mockReturnValue({
      data: makePositions(1),
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof usePortfolioPositionsById>);
    mockedUseTx.mockReturnValue({
      data: {
        transactions: [
          { id: 't2', symbol: 'SYM0', name: 'A', side: 'sell', quantity: 1, price: 120, fee: 0, date: '2026-03-02', isOpening: false, runningShares: 1, realisedPnl: 20 },
          { id: 't1', symbol: 'SYM0', name: 'A', side: 'buy', quantity: 2, price: 100, fee: 0, date: '2026-01-02', isOpening: true, runningShares: 2 },
        ],
        total: 2,
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof usePortfolioTransactions>);
    renderPage();

    expect(screen.getByText('SELL')).toBeInTheDocument();
    expect(screen.getByText('BUY')).toBeInTheDocument();
    expect(screen.getByText(/Opening balance/)).toBeInTheDocument();
  });

  it('filters transactions by symbol', () => {
    mockedUsePositions.mockReturnValue({
      data: makePositions(2),
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof usePortfolioPositionsById>);
    renderPage();

    fireEvent.change(screen.getByLabelText(/filter transactions by symbol/i), { target: { value: 'SYM1' } });
    expect(mockedUseTx).toHaveBeenLastCalledWith('p1', { symbol: 'SYM1' });
  });

  it('opens the Buy form for a holding with its symbol locked', () => {
    mockedUsePositions.mockReturnValue({
      data: makePositions(1),
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof usePortfolioPositionsById>);
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Buy SYM0' }));
    expect(screen.getByRole('heading', { name: 'Buy SYM0' })).toBeInTheDocument();
    expect(screen.getByText('Locked')).toBeInTheDocument();
  });

  it('shows Show more only while more pages exist and fetches the next page', () => {
    const fetchNextPage = vi.fn();
    mockedUsePositions.mockReturnValue({
      data: makePositions(1), isLoading: false, isError: false,
    } as unknown as ReturnType<typeof usePortfolioPositionsById>);
    mockedUseTx.mockReturnValue({
      data: { transactions: [], total: 50 }, isLoading: false, isError: false,
      hasNextPage: true, fetchNextPage, isFetchingNextPage: false,
    } as unknown as ReturnType<typeof usePortfolioTransactions>);
    const { unmount } = renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Show more' }));
    expect(fetchNextPage).toHaveBeenCalled();
    unmount();

    mockedUseTx.mockReturnValue({
      data: { transactions: [], total: 0 }, isLoading: false, isError: false, hasNextPage: false,
    } as unknown as ReturnType<typeof usePortfolioTransactions>);
    renderPage();
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
  });

  it('shows a dash for Realised P&L while closed positions load', () => {
    mockedUsePositions.mockReturnValue({
      data: makePositions(1), isLoading: false, isError: false,
    } as unknown as ReturnType<typeof usePortfolioPositionsById>);
    mockedUseClosed.mockReturnValue({ data: undefined, isLoading: true, isError: false } as unknown as ReturnType<typeof useClosedPositions>);
    renderPage();
    const card = screen.getByText('Realised P&L').closest('div[class*="pfd-stat"]') as HTMLElement;
    expect(card).toHaveTextContent('—');
    expect(card).not.toHaveTextContent('$0.00');
  });

  it('on a closed-positions error keeps the table, shows a dash and a retry, and no empty state', () => {
    const refetch = vi.fn();
    mockedUsePositions.mockReturnValue({
      data: [], isLoading: false, isError: false,
    } as unknown as ReturnType<typeof usePortfolioPositionsById>);
    mockedUseClosed.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch } as unknown as ReturnType<typeof useClosedPositions>);
    renderPage();

    expect(screen.getByText('Current Holdings')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/closed holdings/i);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalled();
    expect(screen.queryByText(/no assets|get started|add your first/i)).not.toBeInTheDocument();
  });

  it('does not render the empty state until the closed query has settled', () => {
    mockedUsePositions.mockReturnValue({
      data: [], isLoading: false, isError: false,
    } as unknown as ReturnType<typeof usePortfolioPositionsById>);
    mockedUseClosed.mockReturnValue({ data: undefined, isLoading: true, isError: false } as unknown as ReturnType<typeof useClosedPositions>);
    const { container } = renderPage();
    expect(container.querySelector('.eps-cta')).toBeNull();
  });
});
