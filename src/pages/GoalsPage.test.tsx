import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderGoalRoutes } from '../test/renderGoalRoutes';
import { deleteGoal, listGoals, type Goal } from '../api/goals';
import { listPortfolios, type Portfolio } from '../api/portfolios';

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
  createdAt: '',
  updatedAt: '',
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
  vi.mocked(listPortfolios).mockResolvedValue(portfolios);
});

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
});
