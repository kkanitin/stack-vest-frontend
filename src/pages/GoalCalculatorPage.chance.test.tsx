import { screen, fireEvent } from '@testing-library/react';
import { renderGoalRoutes } from '../test/renderGoalRoutes';

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ token: 'test-token' }) }));

// Unlinked here; the linked suggestion feeding the chance is in GoalCalculatorPage.portfolio.test.tsx.
vi.mock('../hooks/usePortfolios', () => ({ usePortfolios: () => ({ data: [], isLoading: false, isError: false }) }));
vi.mock('../hooks/useSuggestedReturn', () => ({
  useSuggestedReturn: () => ({ data: undefined, isLoading: false, isError: false, refetch: () => {} }),
}));

function type(label: RegExp | string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function fillRetirement() {
  type('Goal name', 'Retirement');
  type('Monthly amount', '10000');
  type('Years', '30');
  type('Expected return a year', '8');
}

function fillHouse() {
  fireEvent.click(screen.getByRole('radio', { name: 'How much must I save?' }));
  type('Goal name', 'House');
  type('Target amount', '1000000');
  type('Years', '10');
  type('Expected return a year', '7');
}

const chanceText = () => screen.getByTestId('goal-chance-text').textContent ?? '';
const chartLabel = () => screen.getByTestId('goal-chart-card').querySelector('svg')!.getAttribute('aria-label') ?? '';

describe('GoalCalculatorPage chance of reaching the goal (KAN-35)', () => {
  it('without a volatility, shows one muted line and the usual results', () => {
    renderGoalRoutes();
    fillHouse();
    expect(screen.queryByTestId('goal-chance')).not.toBeInTheDocument();
    expect(screen.getByTestId('goal-chance-none')).toHaveTextContent(
      'Add a volatility a year to see the chance of reaching your target.',
    );
    expect(screen.getByTestId('goal-headline')).toHaveTextContent(/THB \/ month/);
    expect(screen.getByTestId('goal-legend-band')).toHaveTextContent('Expected return ∓ 2 points');
  });

  it('gives the chance in target mode, rounded to 5%, with a note', () => {
    renderGoalRoutes();
    fillHouse();
    type('Volatility a year (optional)', '15');
    expect(chanceText()).toMatch(/^About \d*[05]% chance of reaching 1,000,000 THB if you invest [\d,]+ THB a month\.$/);
    expect(screen.getByRole('note', { name: '' })).toHaveTextContent(/2,000 possible paths.*±15% volatility.*not a promise/);
  });

  it('clamps an almost-certain chance', () => {
    renderGoalRoutes();
    fillHouse();
    type('Volatility a year (optional)', '0');
    expect(chanceText()).toMatch(/^Over 95% chance of reaching/);
  });

  it('shows the outcome range in projection mode', () => {
    renderGoalRoutes();
    fillRetirement();
    expect(screen.getByTestId('goal-chance-none')).toHaveTextContent('range of likely outcomes');
    type('Volatility a year (optional)', '15');
    expect(chanceText()).toMatch(/^In 8 of 10 simulated outcomes you end with between [\d,]+ THB and [\d,]+ THB\.$/);
  });

  it("follows the today's-money toggle", () => {
    renderGoalRoutes();
    fillRetirement();
    type('Volatility a year (optional)', '15');
    const future = chanceText();
    fireEvent.click(screen.getByLabelText("Show in today's money"));
    expect(chanceText()).not.toBe(future);

    fireEvent.click(screen.getByRole('radio', { name: 'How much must I save?' }));
    type('Target amount', '1000000');
    expect(chanceText()).toMatch(/reaching 1,000,000 THB in today's money if you invest/);
  });

  it('keeps the last valid chance, dimmed, while a field is invalid', () => {
    renderGoalRoutes();
    fillHouse();
    type('Volatility a year (optional)', '15');
    const before = chanceText();
    type('Years', '');
    expect(screen.getByTestId('goal-results')).toHaveClass('goal-results--stale');
    expect(chanceText()).toBe(before);
  });
});

describe('GoalCalculatorPage growth chart band (KAN-36)', () => {
  it('switches the band and legend to simulated percentiles with a volatility', () => {
    renderGoalRoutes();
    fillRetirement();
    expect(chartLabel()).toMatch(/expected final value .* \(low .*, high .*\)/);
    type('Volatility a year (optional)', '15');
    expect(screen.getByTestId('goal-legend-band')).toHaveTextContent('10th–90th percentile of 2,000 simulations');
    expect(screen.getByText('Median of simulations')).toBeInTheDocument();
    expect(chartLabel()).toMatch(/median final value .* \(10th percentile .*, 90th percentile .*, from 2,000 simulations\)/);
  });

  it('keeps the range card on the low / expected / high returns and says how it differs', () => {
    renderGoalRoutes();
    fillRetirement();
    type('Volatility a year (optional)', '15');
    expect(screen.getByText(/Low · 6% a year/)).toBeInTheDocument();
    expect(screen.getByText(/band shows the spread of simulated outcomes/)).toBeInTheDocument();
  });
});
