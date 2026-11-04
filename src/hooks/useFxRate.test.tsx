import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFxRate } from './useFxRate';
import { getFxRate } from '../api/fx';

vi.mock('../api/fx', () => ({ getFxRate: vi.fn() }));
const mockedGet = vi.mocked(getFxRate);

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const RATE = { from: 'USD', to: 'THB', rate: 35.2, date: '2026-11-04' };

describe('useFxRate', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    localStorage.clear();
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('same currency is rate 1 with no request', () => {
    const { result } = renderHook(() => useFxRate('THB', 'THB'), { wrapper });
    expect(result.current.fx).toMatchObject({ rate: 1, from: 'THB', to: 'THB' });
    expect(result.current.isLoading).toBe(false);
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('an unknown code fetches nothing', () => {
    const { result } = renderHook(() => useFxRate('USD', null), { wrapper });
    expect(result.current).toMatchObject({ fx: undefined, isLoading: false, isError: false });
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('fetches the rate and keeps it for the day', async () => {
    mockedGet.mockResolvedValue(RATE);
    const { result } = renderHook(() => useFxRate('USD', 'THB'), { wrapper });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.fx).toEqual(RATE));
    expect(mockedGet).toHaveBeenCalledWith('USD', 'THB');
    expect(JSON.parse(localStorage.getItem('stackvest:fx:USD:THB')!)).toEqual({ fetchedOn: today(), fx: RATE });
  });

  it('uses a rate fetched earlier today without a request', () => {
    localStorage.setItem('stackvest:fx:USD:THB', JSON.stringify({ fetchedOn: today(), fx: RATE }));
    const { result } = renderHook(() => useFxRate('USD', 'THB'), { wrapper });
    expect(result.current.fx).toEqual(RATE);
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('fetches again once the stored rate is from another day', async () => {
    localStorage.setItem('stackvest:fx:USD:THB', JSON.stringify({ fetchedOn: '2000-01-01', fx: { ...RATE, rate: 30 } }));
    mockedGet.mockResolvedValue(RATE);
    const { result } = renderHook(() => useFxRate('USD', 'THB'), { wrapper });
    await waitFor(() => expect(result.current.fx?.rate).toBe(35.2));
    expect(mockedGet).toHaveBeenCalledTimes(1);
  });

  it('reports a failure and can try again', async () => {
    mockedGet.mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => useFxRate('USD', 'THB'), { wrapper });
    // One automatic retry (about a second) before the error shows.
    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 3000 });
    expect(mockedGet).toHaveBeenCalledTimes(2);
    expect(result.current.fx).toBeUndefined();

    mockedGet.mockResolvedValue(RATE);
    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.fx).toEqual(RATE));
  });

  it('survives storage that throws', async () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    mockedGet.mockResolvedValue(RATE);
    const { result } = renderHook(() => useFxRate('USD', 'THB'), { wrapper });
    await waitFor(() => expect(result.current.fx).toEqual(RATE));
    get.mockRestore();
    set.mockRestore();
  });
});
