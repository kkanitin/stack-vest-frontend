import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import DCASimulation from './DCASimulation';
import { runDcaSimulation, simulateDcaHoldings } from '../api/simulations';
import type { DcaResult, DcaHoldingsSimulation } from '../api/simulations';
import { usePortfolios } from '../hooks/usePortfolios';
import { usePortfolioPositionsById } from '../hooks/usePortfolioPositionsById';
import type { PortfolioPosition } from '../api/portfolio';

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ token: 'test-token' }) }));
vi.mock('../api/simulations', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/simulations')>()),
  runDcaSimulation: vi.fn(),
  simulateDcaHoldings: vi.fn(),
}));
vi.mock('../hooks/useStockSearch', () => ({
  useStockSearch: () => ({ results: [], status: 'idle', error: null }),
}));
vi.mock('../hooks/useElementSize', () => ({
  useElementSize: () => [() => {}, { width: 760, height: 260 }],
}));
vi.mock('../hooks/usePortfolios', () => ({ usePortfolios: vi.fn() }));
vi.mock('../hooks/usePortfolioPositionsById', () => ({ usePortfolioPositionsById: vi.fn() }));

function result(symbol: string, invested: number, value: number, returnPct: number): DcaResult {
  return {
    symbol, startDate: '2024-01-02', endDate: '2024-03-01', frequency: 'weekly', amountPerPeriod: 100,
    totalInvested: invested, finalPortfolioValue: value, totalReturn: value - invested, totalReturnPct: returnPct,
    annualizedReturnPct: 8, annualizedReturnNote: 'simple note', moneyWeightedReturnPct: 11,
    moneyWeightedReturnNote: 'mw note', priceBasisNote: 'price only', periodsCount: 2, totalUnits: 0,
    dataPoints: [
      { date: '2024-01-02', price: 0, unitsPurchased: 0, totalUnits: 0, totalInvested: invested / 2, portfolioValue: invested / 2, returnPct: 0 },
      { date: '2024-03-01', price: 0, unitsPurchased: 0, totalUnits: 0, totalInvested: invested, portfolioValue: value, returnPct },
    ],
  };
}

const single = result('AAPL', 200, 250, 25);
const simulation: DcaHoldingsSimulation = {
  combined: result('PORTFOLIO', 1000, 1300, 30),
  assets: [
    { symbol: 'AAPL', weightPct: 60, result: result('AAPL', 600, 840, 40) },
    { symbol: 'MSFT', weightPct: 40, result: result('MSFT', 400, 460, 15) },
  ],
  skipped: [],
};

function position(symbol: string, valueUsd: number, extra: Partial<PortfolioPosition> = {}): PortfolioPosition {
  return {
    id: symbol, symbol, name: symbol, shares: 1, avgCost: 1, valueUsd, change24h: 0, addedAt: '', costBasis: 0,
    unrealisedPnl: 0, unrealisedPnlPct: 0, realisedPnl: 0, closed: false, ...extra,
  };
}

function givenPortfolio(positions: PortfolioPosition[] | undefined) {
  vi.mocked(usePortfolios).mockReturnValue({
    data: [{ id: 'p1', name: 'Main' }], isLoading: false, isError: false,
  } as unknown as ReturnType<typeof usePortfolios>);
  vi.mocked(usePortfolioPositionsById).mockReturnValue({
    data: positions, isLoading: false, isError: false,
  } as unknown as ReturnType<typeof usePortfolioPositionsById>);
}

describe('DCASimulation: simulate my holdings', () => {
  const holdings = vi.mocked(simulateDcaHoldings);

  beforeEach(() => {
    vi.mocked(runDcaSimulation).mockReset().mockResolvedValue(single);
    holdings.mockReset().mockResolvedValue(simulation);
    givenPortfolio([position('AAPL', 600), position('MSFT', 400)]);
  });

  async function openHoldings() {
    render(<DCASimulation />);
    await screen.findByText('Total Invested');
    fireEvent.click(screen.getByRole('radio', { name: 'My holdings' }));
  }

  it('splits the plan across the portfolio at its current weights, in one request', async () => {
    await openHoldings();

    await waitFor(() => expect(holdings).toHaveBeenCalledTimes(1));
    expect(holdings.mock.calls[0][1]).toMatchObject({
      holdings: [{ symbol: 'AAPL', weight: 60 }, { symbol: 'MSFT', weight: 40 }],
      amount: 100,
      frequency: 'weekly',
    });
    expect(vi.mocked(runDcaSimulation)).toHaveBeenCalledTimes(1); // only the initial single-asset run
  });

  it('shows the combined figures, the per-asset breakdown and a hypothetical note', async () => {
    await openHoldings();

    const table = await screen.findByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveTextContent('AAPL');
    expect(rows[1]).toHaveTextContent('60.0%');
    expect(rows[1]).toHaveTextContent('$600.00');
    expect(rows[1]).toHaveTextContent('+40.00%');
    expect(rows[2]).toHaveTextContent('MSFT');

    const page = document.querySelector('.dca-right')!.textContent!;
    expect(page).toContain('$1,000.00'); // combined invested
    expect(page).toContain('$1,300.00'); // combined value
    expect(page).toContain('+30.00%');
    expect(page).toContain('mw note');

    const note = screen.getByRole('note');
    expect(note).toHaveTextContent('Hypothetical');
    expect(note).toHaveTextContent('not what you actually bought');
    expect(note).toHaveTextContent('favour assets that have already done well');
    expect(screen.getByRole('img')).toBeInTheDocument(); // chart with its text alternative
  });

  it('names the holdings that were left out', async () => {
    holdings.mockResolvedValue({
      ...simulation,
      skipped: [{ symbol: 'NEWCO', reason: 'No price history for this date range' }],
    });
    await openHoldings();
    const notice = await screen.findByText('Left out of the comparison:');
    expect(notice.parentElement).toHaveTextContent('NEWCO');
  });

  it('says so when no holding has enough history', async () => {
    holdings.mockResolvedValue({ combined: null, assets: [], skipped: [{ symbol: 'AAPL', reason: 'No price history for this date range' }] });
    await openHoldings();
    expect(await screen.findByText(/None of this portfolio's holdings has enough price history/)).toBeInTheDocument();
  });

  it('shows a helpful message, not an error, for a portfolio with no holdings, and sends nothing', async () => {
    givenPortfolio([]);
    await openHoldings();

    expect(await screen.findByText(/This portfolio has no holdings yet/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await new Promise(r => setTimeout(r, 450));
    expect(holdings).not.toHaveBeenCalled();
  });

  it('ignores closed positions', async () => {
    givenPortfolio([position('AAPL', 600), position('OLD', 0, { closed: true })]);
    await openHoldings();
    await waitFor(() => expect(holdings).toHaveBeenCalledTimes(1));
    expect(holdings.mock.calls[0][1].holdings).toEqual([{ symbol: 'AAPL', weight: 100 }]);
  });

  it('leaves out an unpriced holding and says so', async () => {
    givenPortfolio([position('AAPL', 600), position('NOQUOTE', 0)]);
    await openHoldings();
    await waitFor(() => expect(holdings).toHaveBeenCalledTimes(1));
    expect(holdings.mock.calls[0][1].holdings).toEqual([{ symbol: 'AAPL', weight: 100 }]);
    expect(screen.getByText(/NOQUOTE left out \(no price\)/)).toBeInTheDocument();
  });

  it('stays within one request for a portfolio at the 20-holding limit', async () => {
    givenPortfolio(Array.from({ length: 20 }, (_, i) => position(`S${i}`, 100 + i)));
    await openHoldings();
    await waitFor(() => expect(holdings).toHaveBeenCalledTimes(1));
    expect(holdings.mock.calls[0][1].holdings).toHaveLength(20);
  });

  it('tells a user with no portfolios where to make one', async () => {
    vi.mocked(usePortfolios).mockReturnValue({ data: [], isLoading: false, isError: false } as unknown as ReturnType<typeof usePortfolios>);
    vi.mocked(usePortfolioPositionsById).mockReturnValue({ data: undefined, isLoading: false, isError: false } as unknown as ReturnType<typeof usePortfolioPositionsById>);
    await openHoldings();
    expect(await screen.findByText(/You have no portfolios yet/)).toBeInTheDocument();
    expect(holdings).not.toHaveBeenCalled();
  });

  it('re-runs the holdings with the new plan in one request when the amount changes', async () => {
    await openHoldings();
    await waitFor(() => expect(holdings).toHaveBeenCalledTimes(1));

    fireEvent.change(document.getElementById('dca-amount')!, { target: { value: '250' } });

    await waitFor(() => expect(holdings).toHaveBeenCalledTimes(2));
    expect(holdings.mock.calls[1][1].amount).toBe(250);
  });

  it('hides the single-asset controls while simulating holdings and brings them back', async () => {
    await openHoldings();
    await screen.findByRole('table');
    expect(screen.queryByLabelText('Target Asset')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Compare with a lump sum')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: 'Single asset' }));
    expect(await screen.findByLabelText('Target Asset')).toBeInTheDocument();
  });
});
