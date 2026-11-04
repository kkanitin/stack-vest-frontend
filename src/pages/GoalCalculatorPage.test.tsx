import { render, screen, fireEvent, within } from '@testing-library/react';
import GoalCalculatorPage from './GoalCalculatorPage';

// The portfolio link (KAN-21) is covered in GoalCalculatorPage.portfolio.test.tsx; here it stays unlinked.
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

const headline = () => screen.getByTestId('goal-headline').textContent ?? '';

describe('GoalCalculatorPage', () => {
  it('shows no results until the form is valid', () => {
    render(<GoalCalculatorPage />);
    expect(screen.getByTestId('goal-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('goal-results')).not.toBeInTheDocument();
    // Required fields complain while empty.
    expect(screen.getByLabelText('Goal name')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Monthly amount')).toHaveAttribute('aria-invalid', 'true');
  });

  it('projects the final value as the user types (≈ 14.9M for the epic example)', () => {
    render(<GoalCalculatorPage />);
    fillRetirement();
    expect(screen.queryByTestId('goal-empty')).not.toBeInTheDocument();
    expect(headline()).toMatch(/^14,9\d\d,\d{3} THB$/);
    expect(screen.getByText('3,600,000 THB')).toBeInTheDocument(); // total invested
    const range = within(screen.getByTestId('goal-range'));
    expect(range.getByText(/Low · 6% a year/)).toBeInTheDocument();
    expect(range.getByText(/Expected · 8% a year/)).toBeInTheDocument();
    expect(range.getByText(/High · 10% a year/)).toBeInTheDocument();
  });

  it("switches every amount to today's money with the toggle (≈ 6.1M at the default 3%)", () => {
    render(<GoalCalculatorPage />);
    fillRetirement();
    fireEvent.click(screen.getByLabelText("Show in today's money"));
    expect(headline()).toMatch(/^6,1\d\d,\d{3} THB$/);
    expect(screen.getByTestId('goal-basis-note')).toHaveTextContent(/today's money.*3% inflation over 30 years/);
  });

  it('solves the monthly amount needed in target mode (≈ 24.7k for 1M in 3 years at 8%)', () => {
    render(<GoalCalculatorPage />);
    fireEvent.click(screen.getByRole('radio', { name: 'How much must I save?' }));
    type('Goal name', 'House');
    type('Target amount', '1000000');
    type('Years', '3');
    type('Expected return a year', '8');
    expect(headline()).toMatch(/^24,[67]\d\d THB \/ month$/);
    // A lower return needs more each month.
    const cells = [...screen.getByTestId('goal-range').querySelectorAll('.goal-range-value')];
    expect(cells.map(c => c.textContent)).toEqual(cells.map(() => expect.stringMatching(/^[\d,]+ THB \/ month$/)));
    const amounts = cells.map(c => Number(c.textContent!.replace(/[^\d]/g, '')));
    expect(amounts[0]).toBeGreaterThan(amounts[1]);
    expect(amounts[1]).toBeGreaterThan(amounts[2]);
  });

  it('keeps the last valid result when a field is cleared, without turning it into 0', () => {
    render(<GoalCalculatorPage />);
    fillRetirement();
    const before = headline();
    type('Monthly amount', '');
    expect(screen.getByLabelText('Monthly amount')).toHaveValue(null);
    expect(screen.getByText('Enter a monthly amount greater than 0.')).toBeInTheDocument();
    expect(headline()).toBe(before);
    expect(screen.getByText(/Showing the last valid result/)).toBeInTheDocument();

    type('Monthly amount', '20000');
    expect(screen.queryByText(/Showing the last valid result/)).not.toBeInTheDocument();
    expect(headline()).not.toBe(before);
  });

  it('shows the currency label with every amount and never a dollar sign', () => {
    render(<GoalCalculatorPage />);
    type('Currency', 'EUR');
    fillRetirement();
    const results = screen.getByTestId('goal-results');
    expect(results.textContent).not.toContain('$');
    expect(results.textContent).not.toContain('THB');
    const amounts = results.textContent!.match(/\d[\d,]* EUR/g) ?? [];
    // headline + total invested + growth + three range cells
    expect(amounts.length).toBe(6);
  });

  it('does not change the numbers when only the currency label changes', () => {
    render(<GoalCalculatorPage />);
    fillRetirement();
    const thb = headline().replace(' THB', '');
    type('Currency', 'USD');
    expect(headline()).toBe(`${thb} USD`);
  });

  it('keeps both amounts when switching modes back and forth', () => {
    render(<GoalCalculatorPage />);
    type('Monthly amount', '5000');
    fireEvent.click(screen.getByRole('radio', { name: 'How much must I save?' }));
    type('Target amount', '750000');
    fireEvent.click(screen.getByRole('radio', { name: 'How much will I have?' }));
    expect(screen.getByLabelText('Monthly amount')).toHaveValue(5000);
    fireEvent.click(screen.getByRole('radio', { name: 'How much must I save?' }));
    expect(screen.getByLabelText('Target amount')).toHaveValue(750000);
  });

  it('says so when the starting amount already reaches the target', () => {
    render(<GoalCalculatorPage />);
    fireEvent.click(screen.getByRole('radio', { name: 'How much must I save?' }));
    type('Goal name', 'Covered');
    type('Starting amount (optional)', '2000000');
    type('Target amount', '1000000');
    type('Years', '3');
    type('Expected return a year', '5');
    expect(headline()).toBe('0 THB / month');
    expect(screen.getByText(/already reaches the target/)).toBeInTheDocument();
  });

  it('draws the growth chart with a text alternative that follows the today\'s-money toggle', () => {
    render(<GoalCalculatorPage />);
    fillRetirement();
    const chart = within(screen.getByTestId('goal-chart-card')).getByRole('img');
    expect(chart.getAttribute('aria-label')).toMatch(
      /^Goal growth over 30 years\. Amount invested 3,600,000 THB; expected final value 14,9\d\d,\d{3} THB/,
    );
    expect(screen.queryByTestId('goal-chart-target')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Show in today's money"));
    expect(chart.getAttribute('aria-label')).toContain(`expected final value ${headline()}`);
  });

  it('draws a target line on the chart in target mode', () => {
    render(<GoalCalculatorPage />);
    fireEvent.click(screen.getByRole('radio', { name: 'How much must I save?' }));
    type('Goal name', 'House');
    type('Target amount', '1000000');
    type('Years', '3');
    type('Expected return a year', '8');
    expect(screen.getByTestId('goal-chart-target')).toBeInTheDocument();
    const label = within(screen.getByTestId('goal-chart-card')).getByRole('img').getAttribute('aria-label');
    expect(label).toContain('Target 1,000,000 THB.');
  });

  describe('short-goal notice', () => {
    function fillHouse(years: string, expectedReturn = '8') {
      fireEvent.click(screen.getByRole('radio', { name: 'How much must I save?' }));
      type('Goal name', 'House');
      type('Target amount', '1000000');
      type('Years', years);
      type('Expected return a year', expectedReturn);
    }
    const notice = () => screen.queryByTestId('short-goal-notice');

    it('compares the monthly amount with cash in target mode under 5 years', () => {
      render(<GoalCalculatorPage />);
      fillHouse('3');
      expect(notice()).toHaveAttribute('role', 'note');
      expect(notice()).toHaveTextContent(
        /^Under 5 years.*At 8% you need 24,[67]\d\d THB a month\. In cash you need 27,778 THB\. Investing saves about 3,\d{3} THB a month, but one bad year in the market could leave you short when you need the money\.$/,
      );
    });

    it('compares final values in projection mode', () => {
      render(<GoalCalculatorPage />);
      type('Goal name', 'Trip');
      type('Monthly amount', '10000');
      type('Years', '2');
      type('Expected return a year', '8');
      expect(notice()).toHaveTextContent(/At 8% you could have [\d,]+ THB\. In cash you would have 240,000 THB\. Investing adds about [\d,]+ THB, but one bad year/);
      expect(notice()).not.toHaveTextContent('a month');
    });

    it('is hidden at 5 years or more and comes back below', () => {
      render(<GoalCalculatorPage />);
      fillHouse('5');
      expect(notice()).not.toBeInTheDocument();
      type('Years', '4.5');
      expect(notice()).toBeInTheDocument();
    });

    it('says when investing does worse than cash', () => {
      render(<GoalCalculatorPage />);
      fillHouse('3', '-2');
      expect(notice()).toHaveTextContent(/At -2% you need [\d,]+ THB a month\. In cash you need 27,778 THB\. At this return investing costs about [\d,]+ THB more a month/);
    });

    it('is informational only: results stay on screen', () => {
      render(<GoalCalculatorPage />);
      fillHouse('1');
      expect(notice()).toBeInTheDocument();
      expect(headline()).toMatch(/THB \/ month$/);
      expect(screen.getByTestId('goal-chart-card')).toBeInTheDocument();
    });
  });
});
