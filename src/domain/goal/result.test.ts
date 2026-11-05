import { computeGoalResult } from './result';
import { DEFAULT_GOAL_FORM, parseGoalInputs } from './inputs';

const retirement = parseGoalInputs({
  ...DEFAULT_GOAL_FORM,
  name: 'Retirement',
  monthlyAmount: '10000',
  years: '30',
  expectedReturn: '8',
  inflation: '3',
});

const house = parseGoalInputs({
  ...DEFAULT_GOAL_FORM,
  kind: 'target',
  name: 'House',
  targetAmount: '1000000',
  years: '3',
  expectedReturn: '8',
  inflation: '3',
});

describe('computeGoalResult — projection', () => {
  it('gives the final value, invested amount, gain and range (epic example ≈ 14.9M)', () => {
    const r = computeGoalResult(retirement, false);
    if (r.kind !== 'projection') throw new Error('expected projection');
    expect(r.headline / 1e6).toBeCloseTo(14.9, 1);
    expect(r.figures.totalInvested).toBe(3_600_000);
    expect(r.figures.gain).toBeCloseTo(r.figures.finalValue - r.figures.totalInvested, 6);
    expect(r.range.low).toBeLessThan(r.range.expected);
    expect(r.range.high).toBeGreaterThan(r.range.expected);
    expect(r.returns).toEqual({ low: 6, expected: 8, high: 10 });
  });

  it("deflates every amount in today's money (≈ 6.1M at 3%)", () => {
    const r = computeGoalResult(retirement, true);
    if (r.kind !== 'projection') throw new Error('expected projection');
    expect(r.headline / 1e6).toBeCloseTo(6.1, 1);
    const factor = 1.03 ** 30;
    expect(r.figures.totalInvested).toBeCloseTo(3_600_000 / factor, 2);
    expect(r.figures.gain).toBeCloseTo(r.figures.finalValue - r.figures.totalInvested, 6);
  });

  it('gives yearly chart points that end on the figures and range, in either money', () => {
    for (const todaysMoney of [false, true]) {
      const r = computeGoalResult(retirement, todaysMoney);
      if (r.kind !== 'projection') throw new Error('expected projection');
      expect(r.chart).toHaveLength(31);
      const last = r.chart!.at(-1)!;
      expect(last.year).toBe(30);
      expect(last.invested).toBeCloseTo(r.figures.totalInvested, 4);
      expect(last.value.expected).toBeCloseTo(r.range.expected, 4);
      expect(last.value.low).toBeCloseTo(r.range.low, 4);
      expect(last.value.high).toBeCloseTo(r.range.high, 4);
    }
  });
});

describe('computeGoalResult — target', () => {
  it('gives the monthly amount needed (epic example ≈ 24.7k) and the plan behind it', () => {
    const r = computeGoalResult(house, false);
    if (r.kind !== 'target') throw new Error('expected target');
    expect(r.headline! / 1000).toBeCloseTo(24.7, 1);
    expect(r.figures!.finalValue).toBeCloseTo(1_000_000, 2);
    expect(r.range.low!).toBeGreaterThan(r.range.expected!);
    expect(r.range.high!).toBeLessThan(r.range.expected!);
    expect(r.targetNominal).toBe(1_000_000);
    // The chart follows the plan at the expected return to the target.
    expect(r.chart!.at(-1)!.value.expected).toBeCloseTo(1_000_000, 2);
    expect(r.chart!.at(-1)!.invested).toBeCloseTo(r.figures!.totalInvested, 4);
  });

  it("keeps the chart in future money in today's money, ending on the grown target", () => {
    const r = computeGoalResult(house, true);
    if (r.kind !== 'target') throw new Error('expected target');
    expect(r.chart!.at(-1)!.value.expected).toBeCloseTo(r.targetNominal, 2);
  });

  it('has no chart when the target cannot be reached', () => {
    // No whole month to save in (the form does not allow this, but the maths returns null for it).
    const unreachable = {
      ...house,
      years: 0.01,
      projection: { ...house.projection, years: 0.01 },
      target: { ...house.target, years: 0.01 },
    };
    const r = computeGoalResult(unreachable, false);
    if (r.kind !== 'target') throw new Error('expected target');
    expect(r.figures).toBeNull();
    expect(r.chart).toBeNull();
  });

  it("grows a target in today's money by inflation, so more is needed each month", () => {
    const nominal = computeGoalResult(house, false);
    const today = computeGoalResult(house, true);
    if (today.kind !== 'target' || nominal.kind !== 'target') throw new Error('expected target');
    expect(today.targetNominal).toBeCloseTo(1_000_000 * 1.03 ** 3, 4);
    expect(today.headline!).toBeGreaterThan(nominal.headline!);
    expect(today.targetAmount).toBe(1_000_000);
  });

  it('needs nothing each month when the starting amount already covers the target', () => {
    const covered = parseGoalInputs({
      ...DEFAULT_GOAL_FORM,
      kind: 'target',
      name: 'Covered',
      startingAmount: '2000000',
      targetAmount: '1000000',
      years: '3',
      expectedReturn: '5',
    });
    const r = computeGoalResult(covered, false);
    if (r.kind !== 'target') throw new Error('expected target');
    expect(r.headline).toBe(0);
    expect(r.figures!.totalInvested).toBe(2_000_000);
  });
});

describe('computeGoalResult — cash comparison for short goals', () => {
  const withYears = (goal: typeof house, years: number) => ({
    ...goal,
    years,
    projection: { ...goal.projection, years },
    target: { ...goal.target, years },
  });

  it('compares monthly amounts with cash in target mode (ticket example: 24.7k vs 27.8k)', () => {
    const r = computeGoalResult(house, false);
    const c = r.cashComparison!;
    expect(c.invested).toBe(r.headline);
    expect(c.invested! / 1000).toBeCloseTo(24.7, 1);
    expect(c.cash).toBeCloseTo(1_000_000 / 36, 6);
    expect(c.benefit).toBeCloseTo(c.cash - c.invested!, 6);
    expect(c.benefit! / 1000).toBeCloseTo(3.1, 1);
  });

  it('compares final values with cash in projection mode', () => {
    const short = withYears(retirement, 3);
    const r = computeGoalResult(short, false);
    const c = r.cashComparison!;
    expect(c.invested).toBe(r.headline);
    expect(c.cash).toBe(360_000); // 10k a month for 36 months at 0%
    expect(c.benefit).toBeCloseTo(c.invested! - 360_000, 6);
    expect(c.benefit!).toBeGreaterThan(0);
  });

  it('uses the same money basis as the headline', () => {
    const short = withYears(retirement, 3);
    const r = computeGoalResult(short, true);
    expect(r.cashComparison!.cash).toBeCloseTo(360_000 / 1.03 ** 3, 4);
    const t = computeGoalResult(house, true);
    if (t.kind !== 'target') throw new Error('expected target');
    expect(t.cashComparison!.cash).toBeCloseTo(t.targetNominal / 36, 6);
  });

  it('is shown under 5 years only', () => {
    expect(computeGoalResult(withYears(house, 4.99), false).cashComparison).not.toBeNull();
    expect(computeGoalResult(withYears(house, 5), false).cashComparison).toBeNull();
    expect(computeGoalResult(retirement, false).cashComparison).toBeNull();
  });

  it('gives a negative benefit when the expected return is below 0%', () => {
    const losing = { ...house, projection: { ...house.projection, annualReturnPct: -2 }, target: { ...house.target, annualReturnPct: -2 } };
    expect(computeGoalResult(losing, false).cashComparison!.benefit!).toBeLessThan(0);
  });
});
