import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderGoalRoutes } from '../test/renderGoalRoutes';
import { deleteGoal, listGoals, type Goal } from '../api/goals';
import { getPortfolio, listPortfolios, type Portfolio } from '../api/portfolios';
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

const portfolios: Portfolio[] = [{ id: 'p1', name: 'Growth', description: '', createdAt: '', updatedAt: '' }];

const retirement: Goal = {
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
  portfolioId: 'p1',
  createdAt: '2026-01-15T05:00:00.000Z',
  updatedAt: '2026-01-15T05:00:00.000Z',
};
const house: Goal = {
  ...retirement,
  id: 'g2',
  name: 'House',
  kind: 'target',
  monthlyAmount: null,
  targetAmount: 1_000_000,
  years: 3,
  portfolioId: 'gone',
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.mocked(listPortfolios).mockResolvedValue(portfolios);
  vi.mocked(getPortfolio).mockResolvedValue(portfolios[0]);
});
afterEach(() => vi.useRealTimers());

describe('GoalsPage', () => {
  it('shows an empty state that starts a new goal', async () => {
    vi.mocked(listGoals).mockResolvedValue([]);
    const { router } = renderGoalRoutes('/dashboard/goals');
    const empty = await screen.findByTestId('goals-empty');
    expect(within(empty).getByText('No goals yet')).toBeInTheDocument();
    fireEvent.click(within(empty).getByRole('link', { name: 'Create your first goal' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/goals/new'));
    expect(await screen.findByRole('heading', { name: 'Goal Calculator' })).toBeInTheDocument();
  });

  it('shows one card per goal with kind, years, the headline result and the linked portfolio', async () => {
    vi.mocked(listGoals).mockResolvedValue([retirement, house]);
    renderGoalRoutes('/dashboard/goals');
    const cards = await screen.findAllByTestId('goal-card');
    expect(cards).toHaveLength(2);

    const first = within(cards[0]);
    expect(first.getByText('Retirement')).toBeInTheDocument();
    expect(first.getByText('How much will I have?')).toBeInTheDocument();
    expect(first.getByText('30 years')).toBeInTheDocument();
    expect(first.getByTestId('goal-card-result')).toHaveTextContent(/^14,9\d\d,\d{3} THB$/);
    expect(await first.findByText('Linked to Growth')).toBeInTheDocument();
    expect(cards[0]).toHaveAttribute('href', '/dashboard/goals/g1');

    const second = within(cards[1]);
    expect(second.getByText('3 years')).toBeInTheDocument();
    expect(second.getByTestId('goal-card-result')).toHaveTextContent(/^24,[67]\d\d THB \/ month$/);
    expect(second.getByText('Linked portfolio removed')).toBeInTheDocument();
  });

  it('deletes from the list after an in-page confirmation, never a browser dialog', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    vi.mocked(listGoals).mockResolvedValueOnce([retirement, house]).mockResolvedValue([house]);
    vi.mocked(deleteGoal).mockResolvedValue();
    renderGoalRoutes('/dashboard/goals');
    const [first] = await screen.findAllByTestId('goal-card');

    fireEvent.click(within(first).getByRole('button', { name: 'Delete Retirement' }));
    const dialog = within(first).getByRole('alertdialog');
    expect(dialog).toHaveTextContent('Delete “Retirement”? This cannot be undone.');

    // Cancel keeps it.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(within(first).queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(deleteGoal).not.toHaveBeenCalled();

    fireEvent.click(within(first).getByRole('button', { name: 'Delete Retirement' }));
    fireEvent.click(within(first).getByRole('button', { name: 'Delete goal' }));
    await waitFor(() => expect(deleteGoal).toHaveBeenCalledWith('test-token', 'g1'));
    await waitFor(() => expect(screen.getAllByTestId('goal-card')).toHaveLength(1));
    expect(screen.getByText('Goal deleted')).toBeInTheDocument();
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('says when the goals cannot be loaded', async () => {
    vi.mocked(listGoals).mockRejectedValue(new Error('Failed to load goals'));
    renderGoalRoutes('/dashboard/goals');
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load goals');
    expect(screen.queryByTestId('goals-empty')).not.toBeInTheDocument();
  });

  describe('progress on linked cards', () => {
    // A year in: 12 × 1,000 USD at 0% puts the plan at 12,000 USD.
    const car: Goal = {
      ...retirement,
      id: 'g3',
      name: 'Car',
      currency: 'USD',
      monthlyAmount: 1_000,
      years: 5,
      expectedReturn: 0,
      createdAt: new Date(2026, 0, 15, 12).toISOString(),
    };

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2027, 0, 20, 12));
    });

    async function cardWithValue(value: number, goal: Goal = car) {
      vi.mocked(listPortfolios).mockResolvedValue([{ ...portfolios[0], value }]);
      vi.mocked(listGoals).mockResolvedValue([goal]);
      renderGoalRoutes('/dashboard/goals');
      const [card] = await screen.findAllByTestId('goal-card');
      return within(card);
    }

    it.each([
      [15_000, 'Ahead', 'Ahead by 3,000 USD', 100],
      [12_100, 'On track', 'Within 2% of the plan', 100],
      [9_000, 'Behind', 'Behind by 3,000 USD', 75],
    ])('value %d → %s', async (value, label, gap, pct) => {
      const card = await cardWithValue(value);
      expect(await card.findByTestId('goal-status')).toHaveTextContent(label);
      expect(card.getByText(gap)).toBeInTheDocument();
      const bar = card.getByRole('progressbar');
      expect(bar).toHaveAttribute('aria-valuenow', String(pct));
      expect(bar).toHaveAccessibleName('Car: portfolio value against the plan today');
    });

    it('marks converted amounts and gives the rate in a tooltip', async () => {
      vi.mocked(getFxRate).mockResolvedValue({ from: 'USD', to: 'THB', rate: 35, date: '2027-01-20' });
      const card = await cardWithValue(300, { ...car, currency: 'THB', monthlyAmount: 1_000 }); // 10,500 THB vs 12,000
      const gap = await card.findByText('Behind by ≈ 1,500 THB');
      expect(gap).toHaveAttribute('title', 'Converted at 1 USD = 35.00 THB, 20 Jan 2027');
      expect(getFxRate).toHaveBeenCalledWith('USD', 'THB');
    });

    it("says when the goal's currency cannot be converted, with no status", async () => {
      const card = await cardWithValue(9_000, { ...car, currency: 'Baht' });
      expect(await card.findByTestId('goal-card-progress')).toHaveTextContent("Can't convert Baht");
      expect(card.queryByTestId('goal-status')).not.toBeInTheDocument();
      expect(getFxRate).not.toHaveBeenCalled();
    });

    it('offers to try again when the rate fails, without opening the goal', async () => {
      vi.mocked(getFxRate).mockRejectedValue(new Error('down'));
      const card = await cardWithValue(300, { ...car, currency: 'THB' });
      const retry = await card.findByRole('button', { name: 'Try again' }, { timeout: 3000 });
      expect(card.getByTestId('goal-card-progress')).toHaveTextContent("Could not load today's USD to THB rate.");

      vi.mocked(getFxRate).mockResolvedValue({ from: 'USD', to: 'THB', rate: 35, date: '2027-01-20' });
      fireEvent.click(retry);
      expect(await card.findByTestId('goal-status')).toHaveTextContent('Behind');
      expect(screen.queryByRole('heading', { name: 'Goal Calculator' })).not.toBeInTheDocument();
    });

    it('shows a muted line while the portfolio has no value', async () => {
      vi.mocked(listPortfolios).mockResolvedValue(portfolios);
      vi.mocked(listGoals).mockResolvedValue([car]);
      renderGoalRoutes('/dashboard/goals');
      const [card] = await screen.findAllByTestId('goal-card');
      expect(await within(card).findByText('No portfolio value yet.')).toBeInTheDocument();
      expect(getPortfolio).toHaveBeenCalledWith('test-token', 'p1');
    });

    it('unlinked and removed-link cards show no progress', async () => {
      vi.mocked(listGoals).mockResolvedValue([{ ...car, portfolioId: null }, { ...car, id: 'g4', portfolioId: 'gone' }]);
      renderGoalRoutes('/dashboard/goals');
      const cards = await screen.findAllByTestId('goal-card');
      await within(cards[1]).findByText('Linked portfolio removed');
      expect(screen.queryByTestId('goal-card-progress')).not.toBeInTheDocument();
    });
  });
});
