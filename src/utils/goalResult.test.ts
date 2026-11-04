import { computeGoalResult } from './goalResult';
import { DEFAULT_GOAL_FORM, parseGoalInputs } from './goalInputs';

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
