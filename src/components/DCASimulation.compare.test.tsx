import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import DCASimulation from './DCASimulation';
import { runDcaSimulation, compareDca } from '../api/simulations';
import type { DcaResult, DcaComparison } from '../api/simulations';

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ token: 'test-token' }) }));
vi.mock('../api/simulations', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/simulations')>()),
  runDcaSimulation: vi.fn(),
  compareDca: vi.fn(),
}));
vi.mock('../hooks/useStockSearch', () => ({
  useStockSearch: () => ({ results: [], status: 'idle', error: null }),
}));
vi.mock('../hooks/useElementSize', () => ({
  useElementSize: () => [() => {}, { width: 760, height: 260 }],
}));

function make(symbol: string, finalValue: number, returnPct: number): DcaResult {
  return {
    symbol, startDate: '2024-01-02', endDate: '2024-03-01', frequency: 'weekly', amountPerPeriod: 100,
    totalInvested: 200, finalPortfolioValue: finalValue, totalReturn: finalValue - 200, totalReturnPct: returnPct,
    annualizedReturnPct: returnPct / 2, annualizedReturnNote: 'simple', moneyWeightedReturnPct: returnPct / 3,
    moneyWeightedReturnNote: 'mw', priceBasisNote: 'price only', periodsCount: 2, totalUnits: 1,
    dataPoints: [
      { date: '2024-01-02', price: 1, unitsPurchased: 1, totalUnits: 1, totalInvested: 100, portfolioValue: 100, returnPct: 0 },
      { date: '2024-03-01', price: 1, unitsPurchased: 0, totalUnits: 1, totalInvested: 200, portfolioValue: finalValue, returnPct },
    ],
  };
}

const single = make('AAPL', 250, 25);
const comparison: DcaComparison = {
  results: [make('AAPL', 250, 25), make('MSFT', 180, -10)],
  skipped: [],
};

describe('DCASimulation asset comparison', () => {
  const simulate = vi.mocked(runDcaSimulation);
  const compare = vi.mocked(compareDca);

  beforeEach(() => {
    simulate.mockReset();
    compare.mockReset();
    simulate.mockResolvedValue(single);
    compare.mockResolvedValue(comparison);
  });

  async function start() {
    render(<DCASimulation />);
    await screen.findByText('Total Invested');
  }
  const add = () => fireEvent.click(screen.getByRole('button', { name: '+ Add an asset to compare' }));

  it('compares with one request for all assets, not one per asset', async () => {
    await start();
    add();

    await waitFor(() => expect(compare).toHaveBeenCalledTimes(1));
    expect(compare.mock.calls[0][1].symbols).toEqual(['AAPL', 'MSFT']);
    expect(simulate).toHaveBeenCalledTimes(1); // only the initial single-asset run
  });

  it('shows a legend, a chart and a table with each asset', async () => {
    await start();
    add();

    const table = await screen.findByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(3); // header + 2 assets
    expect(rows[1]).toHaveTextContent('AAPL');
    expect(rows[1]).toHaveTextContent('$200'); // invested
    expect(rows[1]).toHaveTextContent('$250'); // final value
    expect(rows[1]).toHaveTextContent('+25.00%'); // return
    expect(rows[1]).toHaveTextContent('+12.50%'); // simple yearly
    expect(rows[1]).toHaveTextContent('+8.33%'); // money-weighted yearly
    expect(rows[2]).toHaveTextContent('MSFT');
    expect(rows[2]).toHaveTextContent('-10.00%');

    const legend = document.querySelector('.dca-chart-legend') as HTMLElement;
    expect(legend).toHaveTextContent('AAPL');
    expect(legend).toHaveTextContent('MSFT');
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', expect.stringContaining('AAPL +25.00%, MSFT -10.00%'));
  });

  it('refuses a fourth asset and says why; removing one allows it again', async () => {
    await start();
    add();
    add();

    expect(screen.queryByRole('button', { name: '+ Add an asset to compare' })).not.toBeInTheDocument();
    expect(screen.getByText(/compare up to 3 assets/)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /^Remove / })[0]);
    expect(screen.getByRole('button', { name: '+ Add an asset to compare' })).toBeInTheDocument();
  });

  it('updates every asset in a single request when the plan changes', async () => {
    await start();
    add();
    await waitFor(() => expect(compare).toHaveBeenCalledTimes(1));

    fireEvent.change(document.getElementById('dca-amount')!, { target: { value: '250' } });

    await waitFor(() => expect(compare).toHaveBeenCalledTimes(2));
    expect(compare.mock.calls[1][1]).toMatchObject({ amount: 250, symbols: ['AAPL', 'MSFT'] });
  });

  it('tells the user which asset was left out and why', async () => {
    compare.mockResolvedValue({
      results: [make('AAPL', 250, 25)],
      skipped: [{ symbol: 'NEWCO', reason: 'No price history for this date range' }],
    });
    await start();
    add();

    const notice = await screen.findByText('Left out of the comparison:');
    expect(notice.parentElement).toHaveTextContent('NEWCO');
    expect(notice.parentElement).toHaveTextContent('No price history for this date range');
  });

  it('says so when no asset has enough history', async () => {
    compare.mockResolvedValue({ results: [], skipped: [{ symbol: 'AAPL', reason: 'No price history for this date range' }] });
    await start();
    add();
    expect(await screen.findByText(/None of the selected assets has enough price history/)).toBeInTheDocument();
  });

  it('shows the API error in the banner when the comparison fails', async () => {
    compare.mockRejectedValue(new Error('failed to fetch historical prices'));
    await start();
    add();
    expect(await screen.findByRole('alert')).toHaveTextContent('failed to fetch historical prices');
  });

  it('returns to the single-asset view when the extra assets are removed', async () => {
    await start();
    add();
    await screen.findByRole('table');

    fireEvent.click(screen.getByRole('button', { name: /^Remove / }));

    expect(await screen.findByText('Total Invested')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Compare with a lump sum')).toBeInTheDocument();
  });

  it('hides the lump-sum option while comparing assets', async () => {
    await start();
    add();
    await screen.findByRole('table');
    expect(screen.queryByLabelText('Compare with a lump sum')).not.toBeInTheDocument();
  });
});
