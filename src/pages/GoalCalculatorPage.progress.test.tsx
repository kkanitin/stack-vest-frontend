import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderGoalRoutes } from '../test/renderGoalRoutes';
import { getGoal, listGoals, type Goal } from '../api/goals';
import { getPortfolio, getSuggestedReturn, listPortfolios, type Portfolio } from '../api/portfolios';
import { getFxRate } from '../api/fx';

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
  getPortfolio: vi.fn(),
  getSuggestedReturn: vi.fn(),
}));
vi.mock('../api/fx', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/fx')>()),
  getFxRate: vi.fn(),
}));

const growth = (value?: number): Portfolio => ({ id: 'p1', name: 'Growth', description: '', createdAt: '', updatedAt: '', value });

// Saved a year before "today": 12 × 1,000 USD at 0% puts the plan at 12,000 USD.
const car: Goal = {
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
  updatedAt: new Date(2026, 6, 1, 12).toISOString(),
};

async function openGoal(goal: Goal, value?: number) {
  vi.mocked(listPortfolios).mockResolvedValue([growth(value)]);
  vi.mocked(getGoal).mockResolvedValue(goal);
  renderGoalRoutes(`/dashboard/goals/${goal.id}`);
  await screen.findByRole('heading', { name: goal.name });
  return screen.findByTestId('goal-progress');
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2027, 0, 20, 12));
  vi.mocked(listGoals).mockResolvedValue([]);
  vi.mocked(getSuggestedReturn).mockResolvedValue({ available: false, skipped: [], note: '' } as never);
});
afterEach(() => vi.useRealTimers());

describe('GoalCalculatorPage progress', () => {
  it.each([
    [15_000, 'Ahead', 'Ahead by 3,000 USD', '+3,000 USD'],
    [12_100, 'On track', 'Within 2% of the plan', '+100 USD'],
    [9_000, 'Behind', 'Behind by 3,000 USD', '-3,000 USD'],
  ])('value %d → %s with the figures', async (value, label, gap, signed) => {
    const panel = within(await openGoal(car, value));
    expect(await panel.findByTestId('goal-status')).toHaveTextContent(label);
    expect(panel.getByTestId('goal-progress-gap')).toHaveTextContent(gap);
    expect(panel.getByTestId('goal-progress-value')).toHaveTextContent(`${value.toLocaleString('en-US')} USD`);
    expect(panel.getByTestId('goal-progress-plan')).toHaveTextContent('12,000 USD');
    expect(panel.getByText(signed)).toBeInTheDocument();
    expect(panel.getByText('12 of 60 months')).toBeInTheDocument();
    expect(panel.getByRole('progressbar', { name: 'Portfolio value against the plan today' })).toBeInTheDocument();
    expect(panel.queryByTestId('goal-progress-rate')).not.toBeInTheDocument();
    expect(panel.queryByTestId('goal-progress-target')).not.toBeInTheDocument();
  });

  it('target mode shows the share of the target', async () => {
    const panel = within(await openGoal({ ...car, kind: 'target', monthlyAmount: null, targetAmount: 60_000 }, 30_000));
    expect(await panel.findByTestId('goal-progress-target')).toHaveTextContent('50%');
    expect(panel.getByTestId('goal-status')).toHaveTextContent('Ahead');
  });

  it('converts the portfolio value at today’s rate and says which rate', async () => {
    vi.mocked(getFxRate).mockResolvedValue({ from: 'USD', to: 'THB', rate: 35, date: '2027-01-20' });
    const panel = within(await openGoal({ ...car, currency: 'THB', monthlyAmount: 10_000 }, 3_500)); // 122,500 vs 120,000
    expect(await panel.findByTestId('goal-progress-value')).toHaveTextContent('3,500 USD ≈ 122,500 THB');
    expect(panel.getByTestId('goal-progress-plan')).toHaveTextContent('120,000 THB');
    expect(panel.getByTestId('goal-status')).toHaveTextContent('Ahead');
    expect(panel.getByText('≈ +2,500 THB')).toBeInTheDocument();
    expect(panel.getByTestId('goal-progress-rate')).toHaveTextContent('Converted at 1 USD = 35.00 THB, 20 Jan 2027. Today\'s rate only.');
  });

  it("can't convert a currency label that is not a code", async () => {
    const panel = within(await openGoal({ ...car, currency: 'Baht' }, 9_000));
    expect(await panel.findByRole('status')).toHaveTextContent("Can't convert Baht");
    expect(panel.queryByTestId('goal-status')).not.toBeInTheDocument();
  });

  it('a failed rate offers Try again and never blocks the page', async () => {
    vi.mocked(getFxRate).mockRejectedValue(new Error('down'));
    const panel = within(await openGoal({ ...car, currency: 'THB' }, 400));
    const retry = await panel.findByRole('button', { name: 'Try again' }, { timeout: 3000 });
    expect(screen.getByLabelText('Goal name')).toBeEnabled();

    vi.mocked(getFxRate).mockResolvedValue({ from: 'USD', to: 'THB', rate: 35, date: '2027-01-20' });
    fireEvent.click(retry);
    // 400 USD ≈ 14,000 THB against a 12,000 THB plan.
    expect(await panel.findByTestId('goal-status')).toHaveTextContent('Ahead');
  });

  it('follows the saved goal, with a note while the form has unsaved changes', async () => {
    const panel = within(await openGoal(car, 9_000));
    await panel.findByTestId('goal-status');
    expect(panel.queryByTestId('goal-progress-unsaved')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Monthly amount'), { target: { value: '500' } });
    expect(panel.getByTestId('goal-progress-unsaved')).toHaveTextContent('Progress follows the saved goal.');
    expect(panel.getByTestId('goal-progress-plan')).toHaveTextContent('12,000 USD');
    expect(panel.getByTestId('goal-status')).toHaveTextContent('Behind');
  });

  it('is hidden on a new goal, an unlinked goal and a removed portfolio', async () => {
    vi.mocked(listPortfolios).mockResolvedValue([growth(9_000)]);
    const { unmount } = renderGoalRoutes('/dashboard/goals/new');
    await screen.findByRole('heading', { name: 'Goal Calculator' });
    expect(screen.queryByTestId('goal-progress')).not.toBeInTheDocument();
    unmount();

    vi.mocked(getGoal).mockResolvedValue({ ...car, portfolioId: null });
    const unlinked = renderGoalRoutes('/dashboard/goals/g1');
    await screen.findByRole('heading', { name: 'Car' });
    expect(screen.queryByTestId('goal-progress')).not.toBeInTheDocument();
    unlinked.unmount();

    vi.mocked(getGoal).mockResolvedValue({ ...car, portfolioId: 'gone' });
    renderGoalRoutes('/dashboard/goals/g1');
    await screen.findByRole('heading', { name: 'Car' });
    await waitFor(() => expect(screen.getByText(/Removed portfolio/)).toBeInTheDocument());
    expect(screen.queryByTestId('goal-progress')).not.toBeInTheDocument();
  });

  it('asks for the portfolio detail when the list has no value', async () => {
    vi.mocked(getPortfolio).mockResolvedValue(growth(12_000));
    const panel = within(await openGoal(car));
    expect(await panel.findByTestId('goal-status')).toHaveTextContent('On track');
    expect(getPortfolio).toHaveBeenCalledWith('test-token', 'p1');
  });
});
