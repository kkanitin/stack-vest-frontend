import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBenchmarks } from './useBenchmarks';
import { getBenchmarks } from '../api/portfolios';

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ token: 'test-token' }) }));
vi.mock('../api/portfolios', () => ({ getBenchmarks: vi.fn() }));

const mockedGet = vi.mocked(getBenchmarks);

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useBenchmarks', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    client.clear();
  });

  it('loads the benchmark list with the signed-in token', async () => {
    mockedGet.mockResolvedValue([{ symbol: 'SPY', label: 'S&P 500' }]);
    const { result } = renderHook(() => useBenchmarks(), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual([{ symbol: 'SPY', label: 'S&P 500' }]));
    expect(mockedGet).toHaveBeenCalledWith('test-token');
  });

  it('reports a failed load as an error', async () => {
    mockedGet.mockImplementation(() => Promise.reject(new Error('nope')));
    const { result } = renderHook(() => useBenchmarks(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
