import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAllPositions } from './useAllPositions';
import { useRecentActivity } from './useRecentActivity';
import { listPortfolios, getPortfolioPositions, getPortfolioActivity } from '../api/portfolios';
import type { Portfolio, PortfolioActivity } from '../api/portfolios';
import type { PortfolioPosition } from '../api/portfolio';

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ token: 'test-token' }) }));
vi.mock('../api/portfolios', async importActual => {
  const actual = await importActual<typeof import('../api/portfolios')>();
  return {
    ...actual,
    listPortfolios: vi.fn(),
    getPortfolioPositions: vi.fn(),
    getPortfolioActivity: vi.fn(),
  };
});

const mockedList = vi.mocked(listPortfolios);
const mockedPositions = vi.mocked(getPortfolioPositions);
const mockedActivity = vi.mocked(getPortfolioActivity);

function portfolio(id: string, name: string): Portfolio {
  return { id, name, description: '', createdAt: '', updatedAt: '' };
}

function position(symbol: string): PortfolioPosition {
  return { id: symbol, symbol, name: symbol, shares: 1, avgCost: 1, valueUsd: 100, change24h: 0, addedAt: '' };
}

function activity(id: string, timestamp: string): PortfolioActivity {
  return { id, label: `Bought ${id}`, detail: '1 shares @ $1.00', tone: 'positive', badge: 'BUY', timestamp };
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useAllPositions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedList.mockResolvedValue([portfolio('p1', 'Core'), portfolio('p2', 'Growth')]);
  });

  it('gathers positions from every portfolio', async () => {
    mockedPositions.mockImplementation(async (_token, id) => [position(id === 'p1' ? 'VOO' : 'QQQ')]);
    const { result } = renderHook(() => useAllPositions(), { wrapper });

    await waitFor(() => expect(result.current.positions).toHaveLength(2));
    expect(result.current).toMatchObject({ isLoading: false, isError: false, isPartial: false });
  });

  it('flags the result as partial when one portfolio fails, rather than passing it off as complete', async () => {
    mockedPositions.mockImplementation(async (_token, id) => {
      if (id === 'p2') throw new Error('boom');
      return [position('VOO')];
    });
    const { result } = renderHook(() => useAllPositions(), { wrapper });

    await waitFor(() => expect(result.current.isPartial).toBe(true));
    expect(result.current.positions.map(p => p.symbol)).toEqual(['VOO']);
    expect(result.current.isError).toBe(false);
  });

  it('reports an error when every portfolio fails', async () => {
    mockedPositions.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useAllPositions(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isPartial).toBe(false);
  });

  it('reports an error when the portfolio list itself fails', async () => {
    mockedList.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useAllPositions(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockedPositions).not.toHaveBeenCalled();
  });

  it('is empty, not loading or failed, for a user with no portfolios', async () => {
    mockedList.mockResolvedValue([]);
    const { result } = renderHook(() => useAllPositions(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current).toMatchObject({ positions: [], isError: false, isPartial: false });
  });
});

describe('useRecentActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedList.mockResolvedValue([portfolio('p1', 'Core'), portfolio('p2', 'Growth')]);
  });

  it('merges feeds newest first, names the portfolio, and keeps only the limit', async () => {
    mockedActivity.mockImplementation(async (_token, id) =>
      id === 'p1'
        ? [activity('a', '2026-10-01T10:00:00Z'), activity('c', '2026-09-28T10:00:00Z')]
        : [activity('b', '2026-09-30T10:00:00Z')]
    );
    const { result } = renderHook(() => useRecentActivity(2), { wrapper });

    await waitFor(() => expect(result.current.entries).toHaveLength(2));
    expect(result.current.entries.map(e => [e.id, e.portfolioName])).toEqual([
      ['a', 'Core'],
      ['b', 'Growth'],
    ]);
    expect(mockedActivity).toHaveBeenCalledWith('test-token', 'p1', 2);
  });

  it('flags a partial feed when one portfolio fails', async () => {
    mockedActivity.mockImplementation(async (_token, id) => {
      if (id === 'p2') throw new Error('boom');
      return [activity('a', '2026-10-01T10:00:00Z')];
    });
    const { result } = renderHook(() => useRecentActivity(5), { wrapper });

    await waitFor(() => expect(result.current.isPartial).toBe(true));
    expect(result.current.entries.map(e => e.id)).toEqual(['a']);
  });
});
