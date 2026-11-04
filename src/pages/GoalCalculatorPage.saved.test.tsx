import { act, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderGoalRoutes } from '../test/renderGoalRoutes';
import {
  createGoal,
  deleteGoal,
  getGoal,
  GoalNotFoundError,
  listGoals,
  updateGoal,
  type Goal,
  type GoalBody,
} from '../api/goals';
import { getSuggestedReturn, listPortfolios, type Portfolio } from '../api/portfolios';

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ token: 'test-token' }) }));
vi.mock('../api/goals', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/goals')>()),
  listGoals: vi.fn(),
  getGoal: vi.fn(),
  createGoal: vi.fn(),
  updateGoal: vi.fn(),
  deleteGoal: vi.fn(),
}));
vi.mock('../api/portfolios', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/portfolios')>()),
  listPortfolios: vi.fn(),
  getSuggestedReturn: vi.fn(),
}));

const portfolios: Portfolio[] = [{ id: 'p1', name: 'Growth', description: '', createdAt: '', updatedAt: '' }];

const saved: Goal = {
  id: 'g1',
  name: 'Retirement',
  kind: 'projection',
  currency: 'THB',
  startingAmount: 0,
  monthlyAmount: 10000,
  targetAmount: null,
  years: 30,
  expectedReturn: 8,
  contributionGrowth: null,
  inflation: 3,
  portfolioId: null,
  createdAt: '',
  updatedAt: '',
};

/** What the backend echoes back for a body: the stored goal. */
const stored = (id: string, body: GoalBody): Goal => ({ ...body, id, createdAt: '', updatedAt: '' });

function type(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listPortfolios).mockResolvedValue(portfolios);
  vi.mocked(listGoals).mockResolvedValue([]);
  vi.mocked(getSuggestedReturn).mockResolvedValue({
    available: true,
    annualReturn: 6.5,
    lookback: { startDate: '2016-11-04', endDate: '2026-11-03', years: 10, requestedYears: 10, shortHistory: false },
    holdings: [],
    skipped: [],
    priceBasisNote: '',
  });
});

describe('GoalCalculatorPage saving', () => {
  it('saves a new goal and moves to its own page', async () => {
    vi.mocked(createGoal).mockImplementation(async (_t, body) => stored('g9', body));
    const { router } = renderGoalRoutes();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    type('Goal name', 'Retirement');
    type('Monthly amount', '10000');
    type('Years', '30');
    type('Expected return a year', '8');
    expect(screen.getByTestId('goal-unsaved')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/goals/g9'));
    expect(createGoal).toHaveBeenCalledWith('test-token', {
      name: 'Retirement',
      kind: 'projection',
      currency: 'THB',
      startingAmount: 0,
      monthlyAmount: 10000,
      targetAmount: null,
      years: 30,
      expectedReturn: 8,
      contributionGrowth: null,
      inflation: 3,
      volatility: null,
      portfolioId: null,
    });
    // The saved goal is shown from the cache, without asking the server again.
    expect(await screen.findByRole('button', { name: 'Save changes' })).toBeDisabled();
    expect(screen.queryByTestId('goal-unsaved')).not.toBeInTheDocument();
    expect(screen.getByText('Goal saved')).toBeInTheDocument();
    expect(getGoal).not.toHaveBeenCalled();
  });

  it('asks for whole years before saving', () => {
    renderGoalRoutes();
    type('Goal name', 'Trip');
    type('Monthly amount', '1000');
    type('Years', '2.5');
    type('Expected return a year', '5');
    expect(screen.getByTestId('goal-results')).toBeInTheDocument();
    expect(screen.getByTestId('goal-save-hint')).toHaveTextContent('Saved goals use whole years.');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('shows the backend message when saving fails and stays on the page', async () => {
    vi.mocked(createGoal).mockRejectedValue(new Error('goal limit reached'));
    const { router } = renderGoalRoutes();
    type('Goal name', 'Retirement');
    type('Monthly amount', '10000');
    type('Years', '30');
    type('Expected return a year', '8');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('goal limit reached')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/dashboard/goals/new');
    expect(screen.getByTestId('goal-unsaved')).toBeInTheDocument();
  });

  it('loads a saved goal into the calculator', async () => {
    vi.mocked(getGoal).mockResolvedValue({ ...saved, kind: 'target', targetAmount: 1_000_000, contributionGrowth: 2 });
    renderGoalRoutes('/dashboard/goals/g1');
    expect(await screen.findByRole('heading', { name: 'Retirement' })).toBeInTheDocument();
    expect(getGoal).toHaveBeenCalledWith('test-token', 'g1');
    expect(screen.getByRole('radio', { name: 'How much must I save?' })).toBeChecked();
    expect(field('Goal name')).toHaveValue('Retirement');
    expect(field('Target amount')).toHaveValue(1000000);
    expect(field('Years')).toHaveValue(30);
    expect(field('Expected return a year')).toHaveValue(8);
    expect(field('Yearly increase in monthly amount (optional)')).toHaveValue(2);
    expect(field('Inflation a year (optional)')).toHaveValue(3);
    expect(screen.getByTestId('goal-headline')).toHaveTextContent(/THB \/ month$/);
    // The monthly amount saved alongside is kept for the other mode.
    fireEvent.click(screen.getByRole('radio', { name: 'How much will I have?' }));
    expect(field('Monthly amount')).toHaveValue(10000);
  });

  it('flags edits and saves them with "Save changes"', async () => {
    vi.mocked(getGoal).mockResolvedValue(saved);
    vi.mocked(updateGoal).mockImplementation(async (_t, id, body) => stored(id, body));
    renderGoalRoutes('/dashboard/goals/g1');
    const saveChanges = await screen.findByRole('button', { name: 'Save changes' });
    expect(saveChanges).toBeDisabled();

    type('Monthly amount', '15000');
    expect(screen.getByTestId('goal-unsaved')).toBeInTheDocument();
    // Undoing the edit is not a change.
    type('Monthly amount', '10000');
    expect(screen.queryByTestId('goal-unsaved')).not.toBeInTheDocument();

    type('Monthly amount', '15000');
    fireEvent.change(screen.getByLabelText('Link to a portfolio'), { target: { value: 'p1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(updateGoal).toHaveBeenCalledTimes(1));
    expect(vi.mocked(updateGoal).mock.calls[0][1]).toBe('g1');
    // A saved goal's expected return is the user's: linking a portfolio does not overwrite it.
    expect(vi.mocked(updateGoal).mock.calls[0][2]).toMatchObject({ monthlyAmount: 15000, expectedReturn: 8, portfolioId: 'p1' });
    expect(await screen.findByText('Changes saved')).toBeInTheDocument();
    expect(screen.queryByTestId('goal-unsaved')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });

  it('flags unsaved changes before leaving, in the page', async () => {
    vi.mocked(getGoal).mockResolvedValue(saved);
    const { router } = renderGoalRoutes('/dashboard/goals/g1');
    await screen.findByRole('button', { name: 'Save changes' });
    type('Years', '25');

    await act(() => router.navigate('/dashboard/dca'));
    expect(router.state.location.pathname).toBe('/dashboard/goals/g1');
    const prompt = screen.getByRole('alertdialog');
    expect(prompt).toHaveTextContent('You have unsaved changes.');

    fireEvent.click(screen.getByRole('button', { name: 'Stay' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(field('Years')).toHaveValue(25);

    await act(() => router.navigate('/dashboard/dca'));
    fireEvent.click(screen.getByRole('button', { name: 'Leave without saving' }));
    expect(await screen.findByRole('heading', { name: 'DCA page' })).toBeInTheDocument();
  });

  it('fills an empty volatility on a linked goal without flagging unsaved changes (KAN-34)', async () => {
    // A goal saved before volatility existed: linked, volatility null.
    vi.mocked(getGoal).mockResolvedValue({ ...saved, portfolioId: 'p1', volatility: null });
    vi.mocked(getSuggestedReturn).mockResolvedValue({
      available: true,
      annualReturn: 6.5,
      annualVolatility: 15,
      lookback: { startDate: '2016-11-04', endDate: '2026-11-03', years: 10, requestedYears: 10, shortHistory: false },
      holdings: [],
      skipped: [],
      priceBasisNote: '',
    });
    renderGoalRoutes('/dashboard/goals/g1');
    await waitFor(() => expect(field('Volatility a year (optional)')).toHaveValue(15));
    // The saved return is the user's and stays; the empty volatility is filled in.
    expect(field('Expected return a year')).toHaveValue(8);
    expect(screen.queryByTestId('goal-unsaved')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    // The chance comes from the deferred simulation render.
    expect(await screen.findByTestId('goal-chance')).toBeInTheDocument();

    // Editing it afterwards is a real change.
    type('Volatility a year (optional)', '20');
    expect(screen.getByTestId('goal-unsaved')).toBeInTheDocument();
  });

  it('asks the browser to confirm closing the tab only while there are unsaved changes', async () => {
    vi.mocked(getGoal).mockResolvedValue(saved);
    renderGoalRoutes('/dashboard/goals/g1');
    await screen.findByRole('button', { name: 'Save changes' });
    const unload = () => {
      const e = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(e);
      return e.defaultPrevented;
    };
    expect(unload()).toBe(false);
    type('Years', '25');
    expect(unload()).toBe(true);
  });

  it('leaves freely when nothing changed', async () => {
    vi.mocked(getGoal).mockResolvedValue(saved);
    const { router } = renderGoalRoutes('/dashboard/goals/g1');
    await screen.findByRole('button', { name: 'Save changes' });
    await act(() => router.navigate('/dashboard/dca'));
    expect(await screen.findByRole('heading', { name: 'DCA page' })).toBeInTheDocument();
  });

  it('deletes from the goal page after an in-page confirmation and returns to the list', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    vi.mocked(getGoal).mockResolvedValue(saved);
    vi.mocked(deleteGoal).mockResolvedValue();
    const { router } = renderGoalRoutes('/dashboard/goals/g1');
    await screen.findByRole('button', { name: 'Save changes' });
    // Unsaved edits do not stop a delete from leaving the page.
    type('Years', '25');

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Delete “Retirement”? This cannot be undone.');
    fireEvent.click(screen.getByRole('button', { name: 'Delete goal' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/goals'));
    expect(deleteGoal).toHaveBeenCalledWith('test-token', 'g1');
    expect(await screen.findByTestId('goals-empty')).toBeInTheDocument();
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('opens a goal whose linked portfolio was deleted, shows the link as removed and clears it on save', async () => {
    vi.mocked(getGoal).mockResolvedValue({ ...saved, portfolioId: 'gone' });
    vi.mocked(updateGoal).mockImplementation(async (_t, id, body) => stored(id, body));
    renderGoalRoutes('/dashboard/goals/g1');
    expect(await screen.findByTestId('goal-link-removed')).toHaveTextContent('has been deleted');
    expect(screen.getByRole('option', { name: 'Removed portfolio' })).toBeInTheDocument();
    expect(screen.getByTestId('goal-headline')).toHaveTextContent(/THB$/);
    // No suggestion is asked for a portfolio that no longer exists.
    expect(getSuggestedReturn).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(updateGoal).toHaveBeenCalled());
    expect(vi.mocked(updateGoal).mock.calls[0][2]).toMatchObject({ portfolioId: null });
    await waitFor(() => expect(screen.queryByTestId('goal-link-removed')).not.toBeInTheDocument());
  });

  it('says when a goal does not exist', async () => {
    vi.mocked(getGoal).mockRejectedValue(new GoalNotFoundError());
    renderGoalRoutes('/dashboard/goals/nope');
    expect(await screen.findByTestId('goal-load-error')).toHaveTextContent('This goal does not exist.');
    expect(screen.getByRole('link', { name: 'All goals' })).toHaveAttribute('href', '/dashboard/goals');
  });
});
