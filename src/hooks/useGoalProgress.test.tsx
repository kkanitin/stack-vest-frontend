import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGoalProgress } from './useGoalProgress';
import { getPortfolio, listPortfolios, type Portfolio } from '../api/portfolios';
import { getFxRate } from '../api/fx';
import type { Goal } from '../api/goals';

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ token: 't' }) }));
vi.mock('../api/portfolios', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/portfolios')>()),
  listPortfolios: vi.fn(),
  getPortfolio: vi.fn(),
}));
vi.mock('../api/fx', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/fx')>()),
  getFxRate: vi.fn(),
}));

const mockedList = vi.mocked(listPortfolios);
const mockedGet = vi.mocked(getPortfolio);
const mockedFx = vi.mocked(getFxRate);

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const TODAY = new Date(2027, 0, 20, 12);
const portfolio = (over: Partial<Portfolio> = {}): Portfolio => ({
  id: 'p1',
  name: 'Growth',
  description: '',
  createdAt: '',
  updatedAt: '',
  value: 4_000,
  ...over,
});

// Created a year before TODAY: the plan is 0 + 12 × 1,000 at 0% = 12,000 USD.
const goal = (over: Partial<Goal> = {}): Goal => ({
  id: 'g1',
  name: 'Car',
  kind: 'projection',
  currency: 'USD',
  startingAmount: 0,
  monthlyAmount: 1_000,
  targetAmount: null,
  years: 5,
  expectedReturn: 0,
  contributionGrowth: null,
  inflation: null,
  portfolioId: 'p1',
  createdAt: new Date(2026, 0, 15, 12).toISOString(),
  updatedAt: new Date(2026, 0, 15, 12).toISOString(),
  ...over,
});

const render = (g: Goal | undefined) => renderHook(() => useGoalProgress(g, TODAY), { wrapper });

describe('useGoalProgress', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('not-linked without a goal or a link, with no requests for the portfolio', () => {
    mockedList.mockResolvedValue([portfolio()]);
    expect(render(undefined).result.current).toEqual({ state: 'not-linked' });
    expect(render(goal({ portfolioId: null })).result.current).toEqual({ state: 'not-linked' });
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('loading while the portfolios load', () => {
    mockedList.mockReturnValue(new Promise(() => {}));
    expect(render(goal()).result.current).toEqual({ state: 'loading' });
  });

  it('portfolio-removed when the linked portfolio is not in the list', async () => {
    mockedList.mockResolvedValue([portfolio({ id: 'other' })]);
    const { result } = render(goal());
    await waitFor(() => expect(result.current).toEqual({ state: 'portfolio-removed' }));
  });

  it('no-value with a retry when the portfolios fail to load', async () => {
    mockedList.mockRejectedValueOnce(new Error('down'));
    const { result } = render(goal());
    await waitFor(() => expect(result.current.state).toBe('no-value'));
    const retry = (result.current as { retry?: () => void }).retry;
    expect(retry).toBeTypeOf('function');

    mockedList.mockResolvedValue([portfolio()]);
    act(() => retry!());
    await waitFor(() => expect(result.current.state).toBe('ready'));
  });

  it('ready in the same currency: no FX request', async () => {
    mockedList.mockResolvedValue([portfolio({ value: 11_000 })]);
    const { result } = render(goal());
    await waitFor(() => expect(result.current.state).toBe('ready'));
    expect(result.current).toMatchObject({
      state: 'ready',
      status: 'behind',
      actual: 11_000,
      portfolioValue: 11_000,
      portfolioCurrency: 'USD',
      gap: -1_000,
      fx: null,
      plan: { monthsElapsed: 12, totalMonths: 60, planValue: 12_000 },
      percentOfTarget: null,
    });
    expect(mockedFx).not.toHaveBeenCalled();
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('ready in another currency: converts at today’s rate', async () => {
    mockedList.mockResolvedValue([portfolio({ value: 10_200 })]);
    const rate = { from: 'USD', to: 'THB', rate: 35, date: '2027-01-20' };
    mockedFx.mockResolvedValue(rate);
    const g = goal({ currency: 'thb', monthlyAmount: 30_000 }); // plan 360,000 THB
    const { result } = render(g);
    await waitFor(() => expect(result.current.state).toBe('ready'));
    expect(result.current).toMatchObject({ status: 'on-track', actual: 357_000, gap: -3_000, fx: rate });
    expect(mockedFx).toHaveBeenCalledWith('USD', 'THB');
  });

  it('target mode reports the percent of the target', async () => {
    mockedList.mockResolvedValue([portfolio({ value: 30_000 })]);
    const g = goal({ kind: 'target', monthlyAmount: null, targetAmount: 60_000 }); // 1,000 a month
    const { result } = render(g);
    await waitFor(() => expect(result.current.state).toBe('ready'));
    expect(result.current).toMatchObject({ status: 'ahead', percentOfTarget: 50, gap: 18_000 });
  });

  it('uses the portfolio detail when the list has no value', async () => {
    mockedList.mockResolvedValue([portfolio({ value: undefined })]);
    mockedGet.mockResolvedValue(portfolio({ value: 12_100 }));
    const { result } = render(goal());
    await waitFor(() => expect(result.current.state).toBe('ready'));
    expect(result.current).toMatchObject({ status: 'on-track', actual: 12_100 });
    expect(mockedGet).toHaveBeenCalledWith('t', 'p1');
  });

  it('no-value when neither the list nor the detail has a value', async () => {
    mockedList.mockResolvedValue([portfolio({ value: undefined })]);
    mockedGet.mockResolvedValue(portfolio({ value: undefined }));
    const { result } = render(goal());
    await waitFor(() => expect(result.current).toEqual({ state: 'no-value' }));
  });

  it('fx-unavailable for a currency label the rates do not cover', async () => {
    mockedList.mockResolvedValue([portfolio()]);
    const { result } = render(goal({ currency: 'Baht' }));
    await waitFor(() =>
      expect(result.current).toEqual({ state: 'fx-unavailable', reason: 'unsupported', from: 'USD', to: 'Baht' }),
    );
    expect(mockedFx).not.toHaveBeenCalled();
  });

  it('fx-unavailable with a retry when the rate fails to load', async () => {
    mockedList.mockResolvedValue([portfolio()]);
    mockedFx.mockRejectedValue(new Error('down'));
    const { result } = render(goal({ currency: 'THB' }));
    await waitFor(() => expect(result.current.state).toBe('fx-unavailable'), { timeout: 3000 });
    expect(result.current).toMatchObject({ reason: 'error', from: 'USD', to: 'THB' });

    mockedFx.mockResolvedValue({ from: 'USD', to: 'THB', rate: 35, date: '2027-01-20' });
    act(() => (result.current as { retry?: () => void }).retry!());
    await waitFor(() => expect(result.current.state).toBe('ready'));
  });

  it('unreachable when the plan has no value', async () => {
    mockedList.mockResolvedValue([portfolio()]);
    const { result } = render(goal({ kind: 'target', targetAmount: null }));
    await waitFor(() => expect(result.current).toEqual({ state: 'unreachable' }));
  });

  it('follows a refetched portfolio value', async () => {
    mockedList.mockResolvedValue([portfolio({ value: 11_000 })]);
    const { result } = render(goal());
    await waitFor(() => expect(result.current).toMatchObject({ status: 'behind' }));

    mockedList.mockResolvedValue([portfolio({ value: 15_000 })]);
    await act(() => client.invalidateQueries({ queryKey: ['portfolios'] }));
    await waitFor(() => expect(result.current).toMatchObject({ status: 'ahead', gap: 3_000 }));
  });
});
