import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DCASimulation from './DCASimulation';
import { runDcaSimulation, DcaRequestError } from '../api/simulations';
import { defaultRange, addYears, todayUtc } from '../utils/dcaInputs';
import type { DcaResult } from '../api/simulations';

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ token: 'test-token' }) }));
vi.mock('../api/simulations', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/simulations')>()),
  runDcaSimulation: vi.fn(),
}));
vi.mock('../hooks/useStockSearch', () => ({
  useStockSearch: () => ({ results: [], status: 'idle', error: null }),
}));
vi.mock('../hooks/useElementSize', () => ({
  useElementSize: () => [() => {}, { width: 760, height: 260 }],
}));

function dp(date: string, price: number, totalUnits: number, totalInvested: number) {
  return { date, price, unitsPurchased: 0, totalUnits, totalInvested, portfolioValue: totalUnits * price, returnPct: 0 };
}

// $100 at $10, $100 at $20, ends at $30: DCA 15 units = $450, lump 20 units = $600.
const result: DcaResult = {
  symbol: 'AAPL', startDate: '2024-01-02', endDate: '2024-03-01', frequency: 'monthly',
  amountPerPeriod: 100, totalInvested: 200, finalPortfolioValue: 450, totalReturn: 250, totalReturnPct: 125,
  annualizedReturnPct: 10, annualizedReturnNote: 'simple note', moneyWeightedReturnPct: 12,
  moneyWeightedReturnNote: 'mw note', priceBasisNote: 'price only', periodsCount: 2, totalUnits: 15,
  dataPoints: [dp('2024-01-02', 10, 10, 100), dp('2024-02-01', 20, 15, 200), dp('2024-03-01', 30, 15, 200)],
};

describe('DCASimulation lump-sum comparison', () => {
  beforeEach(() => {
    vi.mocked(runDcaSimulation).mockResolvedValue(result);
  });

  it('is off by default and shows the lump-sum figures, verdict, note and legend when turned on', async () => {
    render(<DCASimulation />);
    await screen.findByText('mw note');
    expect(screen.queryByTestId('lump-sum-kpis')).not.toBeInTheDocument();
    expect(screen.queryByText('Lump Sum')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Compare with a lump sum'));

    const kpis = screen.getByTestId('lump-sum-kpis');
    expect(kpis).toHaveTextContent('$600');
    expect(kpis).toHaveTextContent('+200.00%');
    expect(kpis).toHaveTextContent('+$150');
    expect(kpis).toHaveTextContent('75.00%');
    expect(screen.getByRole('status')).toHaveTextContent('a lump sum did better than DCA by $150');
    expect(screen.getByText(/bought on the first purchase date/)).toBeInTheDocument();
    expect(screen.getByText('Lump Sum')).toBeInTheDocument(); // legend entry
  });

  it('removes the comparison again when turned off', async () => {
    render(<DCASimulation />);
    await screen.findByText('mw note');
    const box = screen.getByLabelText('Compare with a lump sum');
    fireEvent.click(box);
    fireEvent.click(box);
    await waitFor(() => expect(screen.queryByTestId('lump-sum-kpis')).not.toBeInTheDocument());
  });

  it('does not refetch when the comparison is toggled', async () => {
    render(<DCASimulation />);
    await screen.findByText('mw note');
    const calls = vi.mocked(runDcaSimulation).mock.calls.length;
    fireEvent.click(screen.getByLabelText('Compare with a lump sum'));
    expect(vi.mocked(runDcaSimulation).mock.calls.length).toBe(calls);
  });
});

describe('DCASimulation page', () => {
  const run = vi.mocked(runDcaSimulation);

  beforeEach(() => {
    run.mockReset();
    run.mockResolvedValue(result);
  });

  const field = (id: string) => document.getElementById(id) as HTMLInputElement;

  it('opens on the three years ending today and runs once', async () => {
    render(<DCASimulation />);
    await screen.findByText('mw note');

    const { start, end } = defaultRange();
    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith('test-token', {
      symbol: 'AAPL', startDate: start, endDate: end, amount: 100, frequency: 'weekly',
    });
    expect(field('dca-start').value).toBe(start);
    expect(field('dca-end').value).toBe(end);
  });

  it('shows the headline figures, both yearly returns with notes, and the price basis', async () => {
    render(<DCASimulation />);
    await screen.findByText('mw note');

    const text = document.querySelector('.dca-right')!.textContent!;
    expect(text).toContain('$200'); // invested
    expect(text).toContain('$450'); // current value
    expect(text).toContain('+125.00%'); // ROI
    expect(text).toContain('$13.33'); // 200 / 15 units, with cents
    expect(text).toContain('+10.00%');
    expect(text).toContain('+12.00%');
    expect(text).toContain('simple note');
    expect(text).toContain('price only');
  });

  it('shows n/a when the money-weighted return cannot be solved', async () => {
    run.mockResolvedValue({ ...result, moneyWeightedReturnPct: null });
    render(<DCASimulation />);
    expect(await screen.findByText('n/a')).toBeInTheDocument();
  });

  it('shows a loading state while the request is in flight', async () => {
    let resolve!: (r: DcaResult) => void;
    run.mockReturnValue(new Promise<DcaResult>(r => { resolve = r; }));
    render(<DCASimulation />);

    const button = await screen.findByRole('button', { name: 'Running…' });
    expect(button).toBeDisabled();
    expect(screen.queryByText('Total Invested')).not.toBeInTheDocument();

    resolve(result);
    expect(await screen.findByRole('button', { name: 'Run Simulation' })).toBeEnabled();
  });

  it('shows the API error in the banner and lets the user dismiss it', async () => {
    run.mockRejectedValue(new DcaRequestError('failed to fetch historical prices', 500));
    render(<DCASimulation />);

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent('failed to fetch historical prices');
    fireEvent.click(screen.getByLabelText('Dismiss error'));
    expect(screen.queryByText('failed to fetch historical prices')).not.toBeInTheDocument();
  });

  it('explains a missing price history instead of a generic failure', async () => {
    run.mockRejectedValue(new DcaRequestError('symbol not found: AAPL', 404));
    render(<DCASimulation />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No price history found for AAPL in this date range');
  });

  it('flags a cleared amount next to the field, sends nothing, and keeps the last result', async () => {
    render(<DCASimulation />);
    await screen.findByText('mw note');
    run.mockClear();

    fireEvent.change(field('dca-amount'), { target: { value: '' } });

    expect(screen.getByText('Enter an amount greater than 0.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run Simulation' })).toBeDisabled();
    expect(screen.getByText('mw note')).toBeInTheDocument(); // last valid result stays
    await new Promise(r => setTimeout(r, 450)); // longer than the 300 ms debounce
    expect(run).not.toHaveBeenCalled();
    expect(document.querySelector('.dca-error-banner')).toBeNull();
  });

  it.each([
    ['an end date in the future', 'dca-end', addYears(todayUtc(), 1), /cannot be in the future/],
    ['a start that is not before the end', 'dca-start', todayUtc(), /before the end/],
    ['a half-typed date', 'dca-start', '', /valid start date/],
  ])('rejects %s without sending a request', async (_name, id, value, message) => {
    render(<DCASimulation />);
    await screen.findByText('mw note');
    run.mockClear();

    fireEvent.change(field(id), { target: { value } });

    expect(screen.getByText(message)).toBeInTheDocument();
    await new Promise(r => setTimeout(r, 450));
    expect(run).not.toHaveBeenCalled();
  });

  it('checks the range limit for the chosen frequency', async () => {
    render(<DCASimulation />);
    await screen.findByText('mw note');
    run.mockClear();

    fireEvent.change(field('dca-start'), { target: { value: addYears(todayUtc(), -6) } });
    // 6 years is fine weekly (limit 15) ...
    await waitFor(() => expect(run).toHaveBeenCalled());
    expect(screen.queryByText(/Range is too long/)).not.toBeInTheDocument();

    // ... but not daily (limit 5).
    fireEvent.click(screen.getByRole('radio', { name: 'Daily' }));
    expect(screen.getByText(/too long for daily purchases \(max 5 years\)/)).toBeInTheDocument();
  });

  it('runs again with valid inputs after fixing an invalid one', async () => {
    render(<DCASimulation />);
    await screen.findByText('mw note');
    fireEvent.change(field('dca-amount'), { target: { value: '0' } });
    run.mockClear();

    fireEvent.change(field('dca-amount'), { target: { value: '250' } });
    await waitFor(() => expect(run).toHaveBeenCalledTimes(1));
    expect(run.mock.calls[0][1].amount).toBe(250);
  });

  it('states that past results do not predict future ones, and carries no Beta label', async () => {
    render(<DCASimulation />);
    await screen.findByText('mw note');
    expect(screen.getByText(/Past results do not predict future ones/)).toBeInTheDocument();
    expect(screen.queryByText('Beta')).not.toBeInTheDocument();
  });
});
