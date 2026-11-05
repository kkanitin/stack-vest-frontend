import { chanceNote, describeChance, fmtChance, noChanceText } from './chance';
import { computeGoalResult, computeGoalSimulation } from './result';
import { DEFAULT_GOAL_FORM, parseGoalInputs, type GoalFormInputs } from './inputs';

const house: GoalFormInputs = {
  ...DEFAULT_GOAL_FORM,
  kind: 'target',
  name: 'House',
  targetAmount: '1000000',
  years: '10',
  expectedReturn: '7',
  inflation: '3',
  volatility: '15',
};

const retirement: GoalFormInputs = {
  ...DEFAULT_GOAL_FORM,
  name: 'Retirement',
  monthlyAmount: '10000',
  years: '30',
  expectedReturn: '8',
  volatility: '15',
};

function both(form: GoalFormInputs, todaysMoney = false) {
  const goal = parseGoalInputs(form);
  return { result: computeGoalResult(goal, todaysMoney), sim: computeGoalSimulation(goal, todaysMoney)! };
}

describe('fmtChance', () => {
  it('rounds to the nearest 5%', () => {
    expect(fmtChance(0.5)).toBe('About 50%');
    expect(fmtChance(0.68)).toBe('About 70%');
    expect(fmtChance(0.724)).toBe('About 70%');
    expect(fmtChance(0.726)).toBe('About 75%');
    expect(fmtChance(0.05)).toBe('About 5%');
    expect(fmtChance(0.95)).toBe('About 95%');
  });

  it('clamps the ends so it never sounds certain', () => {
    expect(fmtChance(0)).toBe('Less than 5%');
    expect(fmtChance(0.049)).toBe('Less than 5%');
    expect(fmtChance(0.951)).toBe('Over 95%');
    expect(fmtChance(1)).toBe('Over 95%');
  });
});

describe('describeChance', () => {
  it('gives the chance of reaching the target at the monthly amount needed', () => {
    const { result, sim } = both(house);
    expect(describeChance(result, sim)).toMatch(
      /^About (45|50|55)% chance of reaching 1,000,000 THB if you invest 5,\d{3} THB a month\.$/,
    );
  });

  it("says when the target is in today's money", () => {
    const { result, sim } = both(house, true);
    expect(describeChance(result, sim)).toMatch(/of reaching 1,000,000 THB in today's money if you invest 7,\d{3} THB/);
  });

  it('handles a starting amount that already covers the target', () => {
    const { result, sim } = both({ ...house, startingAmount: '2000000' });
    expect(describeChance(result, sim)).toMatch(/chance of reaching 1,000,000 THB with your starting amount alone\.$/);
  });

  it('gives the 10th–90th percentile range in projection mode', () => {
    const { result, sim } = both(retirement);
    expect(describeChance(result, sim)).toMatch(
      /^In 8 of 10 simulated outcomes you end with between [\d,]+ THB and [\d,]+ THB\.$/,
    );
  });

  it('notes where the figure comes from and what it is not', () => {
    const { sim } = both(retirement);
    expect(chanceNote(sim)).toMatch(/^Simulated from 2,000 possible paths .* ±15% volatility a year\..*not a promise/);
  });

  it('explains a missing chance for each mode', () => {
    expect(noChanceText('target')).toMatch(/volatility.*chance of reaching your target/);
    expect(noChanceText('projection')).toMatch(/volatility.*range of likely outcomes/);
  });
});

describe('computeGoalSimulation', () => {
  it('is null without a volatility', () => {
    expect(computeGoalSimulation(parseGoalInputs({ ...retirement, volatility: '' }), false)).toBeNull();
    expect(computeGoalSimulation(parseGoalInputs({ ...house, volatility: ' ' }), false)).toBeNull();
  });

  it('reaches the target for sure at volatility 0', () => {
    const { sim } = both({ ...house, volatility: '0' });
    expect(sim.probability).toBe(1);
  });

  it("deflates the projection percentiles in today's money", () => {
    const future = both(retirement).sim;
    const today = both(retirement, true).sim;
    const factor = 1.03 ** 30;
    expect(today.final.expected).toBeCloseTo(future.final.expected / factor, 2);
    expect(today.final.low).toBeCloseTo(future.final.low / factor, 2);
    expect(today.chart.at(-1)!.value).toEqual(today.final);
  });

  it('has no probability in projection mode', () => {
    expect(both(retirement).sim.probability).toBeNull();
  });
});
