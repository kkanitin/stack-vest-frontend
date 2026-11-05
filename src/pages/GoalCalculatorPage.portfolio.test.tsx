import { screen, fireEvent } from '@testing-library/react';
import { renderGoalRoutes } from '../test/renderGoalRoutes';

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ token: 'test-token' }) }));
import { usePortfolios } from '../hooks/usePortfolios';
import { useSuggestedReturn } from '../hooks/useSuggestedReturn';
import type { Portfolio, SuggestedReturn } from '../api/portfolios';

vi.mock('../hooks/usePortfolios', () => ({ usePortfolios: vi.fn() }));
vi.mock('../hooks/useSuggestedReturn', () => ({ useSuggestedReturn: vi.fn() }));

const mockedPortfolios = vi.mocked(usePortfolios);
const mockedSuggestion = vi.mocked(useSuggestedReturn);

const portfolios: Portfolio[] = [
  { id: 'p1', name: 'Growth', description: '', createdAt: '', updatedAt: '' },
  { id: 'p2', name: 'Income', description: '', createdAt: '', updatedAt: '' },
  { id: 'p3', name: 'Cash only', description: '', createdAt: '', updatedAt: '' },
];

function suggestion(rate: number, over: Partial<SuggestedReturn> = {}): SuggestedReturn {
  return {
    available: true,
    annualReturn: rate,
    lookback: { startDate: '2016-11-04', endDate: '2026-11-03', years: 10, requestedYears: 10, shortHistory: false },
    holdings: [],
    skipped: [],
    priceBasisNote: 'Price movement only: dividends are not included.',
    ...over,
  };
}

const none: SuggestedReturn = {
  available: false,
  annualReturn: null,
  lookback: null,
  holdings: [],
  skipped: [{ symbol: 'XYZ', code: 'no_history', reason: 'not enough price history' }],
  note: "None of this portfolio's holdings has a current price and enough price history to suggest a return.",
  priceBasisNote: 'Price movement only.',
};

type QueryState = { data?: SuggestedReturn; isLoading?: boolean; isError?: boolean };
let byId: Record<string, QueryState>;
const refetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mockedPortfolios.mockReturnValue({ data: portfolios, isLoading: false, isError: false } as unknown as ReturnType<typeof usePortfolios>);
  byId = {
    p1: { data: suggestion(7.4) },
    p2: { data: suggestion(5.25) },
    p3: { data: none },
  };
  mockedSuggestion.mockImplementation(id => {
    const s = id ? byId[id] ?? {} : {};
    return { data: s.data, isLoading: !!s.isLoading, isError: !!s.isError, refetch } as unknown as ReturnType<typeof useSuggestedReturn>;
  });
});

const returnField = () => screen.getByLabelText('Expected return a year') as HTMLInputElement;
const pick = (id: string) => fireEvent.change(screen.getByLabelText('Link to a portfolio'), { target: { value: id } });
const typeReturn = (v: string) => fireEvent.change(returnField(), { target: { value: v } });

describe('GoalCalculatorPage portfolio link', () => {
  it('starts unlinked with an empty expected return and asks for no suggestion', () => {
    renderGoalRoutes();
    expect(screen.getByLabelText('Link to a portfolio')).toHaveValue('');
    expect(screen.getByRole('option', { name: 'No portfolio' })).toBeInTheDocument();
    expect(returnField()).toHaveValue(null);
    expect(mockedSuggestion).toHaveBeenLastCalledWith(undefined);
    expect(screen.queryByTestId('goal-suggestion')).not.toBeInTheDocument();
  });

  it('fills the field from the linked portfolio and says where it came from', () => {
    renderGoalRoutes();
    pick('p1');
    expect(mockedSuggestion).toHaveBeenLastCalledWith('p1');
    expect(returnField()).toHaveValue(7.4);
    expect(screen.getByTestId('goal-suggestion')).toHaveTextContent(
      'Suggested 7.4% a year from your holdings, 2016–2026, price only.',
    );
    // Already the suggestion: nothing to put back.
    expect(screen.queryByRole('button', { name: 'Use suggested' })).not.toBeInTheDocument();
  });

  it('lets the user overwrite it and puts the suggestion back on "Use suggested"', () => {
    renderGoalRoutes();
    pick('p1');
    typeReturn('9');
    expect(returnField()).toHaveValue(9);
    fireEvent.click(screen.getByRole('button', { name: 'Use suggested' }));
    expect(returnField()).toHaveValue(7.4);
  });

  it('updates a filled-in suggestion when the portfolio changes', () => {
    renderGoalRoutes();
    pick('p1');
    pick('p2');
    expect(returnField()).toHaveValue(5.25);
    expect(screen.getByTestId('goal-suggestion')).toHaveTextContent('Suggested 5.25% a year');
  });

  it('never replaces a value the user typed when the portfolio changes', () => {
    renderGoalRoutes();
    typeReturn('6');
    pick('p1');
    expect(returnField()).toHaveValue(6);
    pick('p2');
    expect(returnField()).toHaveValue(6);
    expect(screen.getByTestId('goal-suggestion')).toHaveTextContent('Suggested 5.25%');
    pick('');
    expect(returnField()).toHaveValue(6);
  });

  it('clears a filled-in suggestion when unlinked', () => {
    renderGoalRoutes();
    pick('p1');
    pick('');
    expect(returnField()).toHaveValue(null);
    expect(screen.queryByTestId('goal-suggestion')).not.toBeInTheDocument();
  });

  it('shows "No suggestion for this portfolio" and names the holdings left out', () => {
    renderGoalRoutes();
    pick('p1');
    pick('p3');
    expect(screen.getByText('No suggestion for this portfolio.')).toBeInTheDocument();
    expect(returnField()).toHaveValue(null);
    expect(screen.getByText('Left out of the suggestion:')).toBeInTheDocument();
    expect(screen.getByText('XYZ')).toBeInTheDocument();
    expect(screen.getByText(/not enough price history/)).toBeInTheDocument();
  });

  it('names skipped holdings alongside an available suggestion', () => {
    byId.p1 = { data: suggestion(7.4, { skipped: [{ symbol: 'ABC', code: 'no_price', reason: 'no current price' }] }) };
    renderGoalRoutes();
    pick('p1');
    expect(returnField()).toHaveValue(7.4);
    expect(screen.getByText('ABC')).toBeInTheDocument();
  });

  it('keeps the form usable while the suggestion loads or fails', () => {
    byId.p1 = { isLoading: true };
    byId.p2 = { isError: true };
    renderGoalRoutes();
    pick('p1');
    expect(screen.getByText('Working out a suggested return…')).toBeInTheDocument();
    typeReturn('8');
    expect(returnField()).toHaveValue(8);
    expect(returnField()).not.toBeDisabled();

    pick('p2');
    expect(screen.getByText(/Could not get a suggested return/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'try again' }));
    expect(refetch).toHaveBeenCalled();
    expect(returnField()).toHaveValue(8);
  });

  it('fills the field once a slow suggestion arrives', () => {
    byId.p1 = { isLoading: true };
    renderGoalRoutes();
    pick('p1');
    expect(returnField()).toHaveValue(null);
    byId.p1 = { data: suggestion(7.4) };
    // Any re-render reads the query again; the mocked hook has no store to notify the page.
    fireEvent.click(screen.getByLabelText("Show in today's money"));
    expect(returnField()).toHaveValue(7.4);
  });

  it('still works when the portfolios cannot be loaded', () => {
    mockedPortfolios.mockReturnValue({ data: undefined, isLoading: false, isError: true } as unknown as ReturnType<typeof usePortfolios>);
    renderGoalRoutes();
    expect(screen.getByText(/Could not load your portfolios/)).toBeInTheDocument();
    typeReturn('7');
    expect(returnField()).toHaveValue(7);
  });
});

const volField = () => screen.getByLabelText('Volatility a year (optional)') as HTMLInputElement;
const typeVol = (v: string) => fireEvent.change(volField(), { target: { value: v } });

describe('GoalCalculatorPage volatility (KAN-34)', () => {
  beforeEach(() => {
    byId.p1 = { data: suggestion(7.4, { annualVolatility: 15 }) };
    byId.p2 = { data: suggestion(5.25, { annualVolatility: 9.5 }) };
  });

  it('is empty when unlinked, with a hint that empty skips the probability', () => {
    renderGoalRoutes();
    expect(volField()).toHaveValue(null);
    expect(screen.getByText(/Leave empty to skip the chance of reaching your goal/)).toBeInTheDocument();
  });

  it('fills from the linked portfolio and names it in the suggestion', () => {
    renderGoalRoutes();
    pick('p1');
    expect(volField()).toHaveValue(15);
    expect(screen.getByTestId('goal-suggestion')).toHaveTextContent(
      'Suggested 7.4% a year, ±15% volatility, from your holdings, 2016–2026, price only.',
    );
    expect(screen.queryByRole('button', { name: 'Use suggested volatility' })).not.toBeInTheDocument();
  });

  it('follows the link when filled in: switch portfolio, then unlink', () => {
    renderGoalRoutes();
    pick('p1');
    pick('p2');
    expect(volField()).toHaveValue(9.5);
    pick('');
    expect(volField()).toHaveValue(null);
  });

  it('keeps a typed value and offers "Use suggested volatility"', () => {
    renderGoalRoutes();
    typeVol('22');
    pick('p1');
    expect(volField()).toHaveValue(22);
    expect(returnField()).toHaveValue(7.4);
    pick('p2');
    expect(volField()).toHaveValue(22);
    fireEvent.click(screen.getByRole('button', { name: 'Use suggested volatility' }));
    expect(volField()).toHaveValue(9.5);
    expect(returnField()).toHaveValue(5.25);
  });

  it('is left to the user when the portfolio has no volatility', () => {
    byId.p1 = { data: suggestion(7.4, { annualVolatility: null }) };
    renderGoalRoutes();
    pick('p1');
    expect(returnField()).toHaveValue(7.4);
    expect(volField()).toHaveValue(null);
    expect(screen.getByTestId('goal-suggestion')).toHaveTextContent('Suggested 7.4% a year from your holdings');
  });

  it('feeds the chance of reaching the goal (KAN-35)', () => {
    renderGoalRoutes();
    fireEvent.change(screen.getByLabelText('Goal name'), { target: { value: 'Retirement' } });
    fireEvent.change(screen.getByLabelText('Monthly amount'), { target: { value: '10000' } });
    fireEvent.change(screen.getByLabelText('Years'), { target: { value: '30' } });
    expect(screen.queryByTestId('goal-chance')).not.toBeInTheDocument();
    pick('p1');
    expect(screen.getByTestId('goal-chance-text')).toHaveTextContent(/^In 8 of 10 simulated outcomes/);
    expect(screen.getByTestId('goal-chance')).toHaveTextContent('±15% volatility a year');
    // Unlinking clears the filled-in return, so the last valid result stays, dimmed.
    pick('');
    expect(screen.getByTestId('goal-results')).toHaveClass('goal-results--stale');
    // The cleared return was never typed in, but the stale note points at it, so it is flagged.
    expect(returnField()).toHaveAttribute('aria-invalid', 'true');
  });

  it('flags an out-of-range value', () => {
    renderGoalRoutes();
    typeVol('120');
    expect(volField()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(/Enter a volatility between 0% and 100%/)).toBeInTheDocument();
  });
});
