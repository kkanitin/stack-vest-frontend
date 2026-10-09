import type { ReactNode } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useHoldingTransactions } from './useHoldingTransactions';
import { usePortfolioTransactions } from './usePortfolioTransactions';
import { useClosedPositions } from './useClosedPositions';
import { useTransactionMutations } from './useTransactionMutations';
import { listTransactions, createTransaction, deleteTransaction } from '../api/transactions';
import { getPortfolioPositions } from '../api/portfolios';

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ token: 'test-token' }) }));
vi.mock('../api/transactions', () => ({
  listTransactions: vi.fn(),
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
}));
vi.mock('../api/portfolios', () => ({ getPortfolioPositions: vi.fn() }));

const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('transaction hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.clear();
  });

  it('useHoldingTransactions lists one symbol and unwraps the page', async () => {
    vi.mocked(listTransactions).mockResolvedValue({ transactions: [{ id: 't1' } as never] });
    const { result } = renderHook(() => useHoldingTransactions('p1', 'AAPL'), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual([{ id: 't1' }]));
    expect(listTransactions).toHaveBeenCalledWith('test-token', 'p1', { symbol: 'AAPL', page: 1, size: 100 });
  });

  it('useHoldingTransactions pages in chunks of at most 100 and appends older rows', async () => {
    const row = (i: number) => ({ id: `t${i}` }) as never;
    vi.mocked(listTransactions)
      .mockResolvedValueOnce({ transactions: Array.from({ length: 100 }, (_, i) => row(i)), total: 130 })
      .mockResolvedValueOnce({ transactions: Array.from({ length: 30 }, (_, i) => row(100 + i)), total: 130 });
    const { result } = renderHook(() => useHoldingTransactions('p1', 'AAPL'), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(100));
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => { await result.current.fetchNextPage(); });
    await waitFor(() => expect(result.current.data).toHaveLength(130));
    expect(result.current.hasNextPage).toBe(false);
    expect(listTransactions).toHaveBeenLastCalledWith('test-token', 'p1', { symbol: 'AAPL', page: 2, size: 100 });
    for (const call of vi.mocked(listTransactions).mock.calls) {
      expect(call[2]?.size).toBeLessThanOrEqual(100);
    }
  });

  it('useHoldingTransactions stays idle without a symbol', () => {
    renderHook(() => useHoldingTransactions('p1', undefined), { wrapper });
    expect(listTransactions).not.toHaveBeenCalled();
  });

  it('usePortfolioTransactions passes the symbol filter and appends further pages', async () => {
    const row = (i: number) => ({ id: `t${i}` }) as never;
    vi.mocked(listTransactions)
      .mockResolvedValueOnce({ transactions: Array.from({ length: 20 }, (_, i) => row(i)), total: 25 })
      .mockResolvedValueOnce({ transactions: Array.from({ length: 5 }, (_, i) => row(20 + i)), total: 25 });
    const { result } = renderHook(() => usePortfolioTransactions('p1', { symbol: 'MSFT' }), { wrapper });
    await waitFor(() => expect(result.current.data?.transactions).toHaveLength(20));
    expect(listTransactions).toHaveBeenCalledWith('test-token', 'p1', { symbol: 'MSFT', page: 1, size: 20 });
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => { await result.current.fetchNextPage(); });
    await waitFor(() => expect(result.current.data?.transactions).toHaveLength(25));
    expect(listTransactions).toHaveBeenLastCalledWith('test-token', 'p1', { symbol: 'MSFT', page: 2, size: 20 });
    expect(result.current.hasNextPage).toBe(false);
  });

  it('useClosedPositions requests closed rows and keeps only the closed ones', async () => {
    vi.mocked(getPortfolioPositions).mockResolvedValue([
      { symbol: 'A', closed: false },
      { symbol: 'B', closed: true },
    ] as never);
    const { result } = renderHook(() => useClosedPositions('p1'), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual([{ symbol: 'B', closed: true }]));
    expect(getPortfolioPositions).toHaveBeenCalledWith('test-token', 'p1', { includeClosed: true });
  });

  it('mutations call the API and invalidate portfolio and cross-portfolio keys', async () => {
    vi.mocked(createTransaction).mockResolvedValue({ transaction: {} as never, position: null });
    vi.mocked(deleteTransaction).mockResolvedValue(undefined);
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useTransactionMutations('p1'), { wrapper });
    const body = { symbol: 'AAPL', name: 'Apple', side: 'buy' as const, quantity: 1, price: 2, date: '2026-01-01' };

    await act(async () => { await result.current.create.mutateAsync(body); });
    expect(createTransaction).toHaveBeenCalledWith('test-token', 'p1', body);
    const keys = spy.mock.calls.map(c => JSON.stringify((c[0] as { queryKey: unknown }).queryKey));
    expect(keys).toContain(JSON.stringify(['portfolio', 'p1']));
    expect(keys).toContain(JSON.stringify(['portfolios']));
    expect(keys).toContain(JSON.stringify(['dividendCalendar']));

    await act(async () => { await result.current.remove.mutateAsync('t1'); });
    expect(deleteTransaction).toHaveBeenCalledWith('test-token', 'p1', 't1');
  });
});
