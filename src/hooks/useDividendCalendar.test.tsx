import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDividendCalendar } from './useDividendCalendar';
import { getDividendCalendar } from '../api/dividends';

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ token: 'test-token' }) }));
vi.mock('../api/dividends', () => ({ getDividendCalendar: vi.fn() }));

const mockedGet = vi.mocked(getDividendCalendar);

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useDividendCalendar', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedGet.mockResolvedValue([]);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('requests the viewed month once it has settled', async () => {
    const { result } = renderHook(() => useDividendCalendar({ y: 2026, m: 7 }), { wrapper });

    expect(result.current.data).toBeUndefined();
    expect(mockedGet).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(300));

    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(mockedGet.mock.calls[0][0]).toBe('test-token');
    expect(mockedGet.mock.calls[0][1]).toEqual({ from: '2026-07-01', to: '2026-07-31' });
    expect(result.current.data).toEqual([]);
  });

  it('skips the months stepped through on the way', async () => {
    const { rerender } = renderHook(({ view }) => useDividendCalendar(view), {
      wrapper,
      initialProps: { view: { y: 2026, m: 7 } },
    });

    // Three quick steps, each well inside the settle delay.
    for (const m of [8, 9, 10]) {
      await act(() => vi.advanceTimersByTimeAsync(50));
      rerender({ view: { y: 2026, m } });
    }
    await act(() => vi.advanceTimersByTimeAsync(300));

    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(mockedGet.mock.calls[0][1]).toEqual({ from: '2026-10-01', to: '2026-10-31' });
  });
});
