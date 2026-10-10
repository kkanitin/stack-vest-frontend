import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAllPositions } from './useAllPositions';
import { useRecentActivity } from './useRecentActivity';
import { getAllPositions, getRecentActivity } from '../api/portfolios';
import type { PortfolioActivity } from '../api/portfolios';
import type { PortfolioPosition } from '../api/portfolio';

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ token: 'test-token' }) }));
vi.mock('../api/portfolios', async importActual => {
  const actual = await importActual<typeof import('../api/portfolios')>();
  return {
    ...actual,
    getAllPositions: vi.fn(),
    getRecentActivity: vi.fn(),
  };
});

const mockedPositions = vi.mocked(getAllPositions);
const mockedActivity = vi.mocked(getRecentActivity);

function position(symbol: string): PortfolioPosition {
  return {
    id: symbol,
    symbol,
    name: symbol,
    shares: 1,
    avgCost: 1,
    valueUsd: 100,
    change24h: 0,
    addedAt: '',
    costBasis: 1,
    unrealisedPnl: 99,
    unrealisedPnlPct: 9900,
    realisedPnl: 0,
    closed: false,
  };
}

function activity(id: string, timestamp: string): PortfolioActivity {
  return {
    id,
    label: `Bought ${id}`,
    detail: '1 shares @ $1.00',
    tone: 'positive',
    badge: 'BUY',
    timestamp,
    portfolioId: 'p1',
    portfolioName: 'Core',
  };
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useAllPositions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads every position across portfolios in one request', async () => {
    mockedPositions.mockResolvedValue([position('VOO'), position('QQQ')]);
    const { result } = renderHook(() => useAllPositions(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map(p => p.symbol)).toEqual(['VOO', 'QQQ']);
    expect(mockedPositions).toHaveBeenCalledTimes(1);
    expect(mockedPositions).toHaveBeenCalledWith('test-token');
  });

  it('is empty, not loading or failed, for a user with no positions', async () => {
    mockedPositions.mockResolvedValue([]);
    const { result } = renderHook(() => useAllPositions(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current).toMatchObject({ data: [], isError: false });
  });

  it('reports an error when the request fails', async () => {
    mockedPositions.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useAllPositions(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});

describe('useRecentActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the feed from one request and passes the limit through', async () => {
    mockedActivity.mockResolvedValue([
      activity('a', '2026-10-01T10:00:00Z'),
      activity('b', '2026-09-30T10:00:00Z'),
    ]);
    const { result } = renderHook(() => useRecentActivity(2), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map(e => e.id)).toEqual(['a', 'b']);
    expect(mockedActivity).toHaveBeenCalledTimes(1);
    expect(mockedActivity).toHaveBeenCalledWith('test-token', 2);
  });

  it('reports an error when the request fails', async () => {
    mockedActivity.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useRecentActivity(5), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
