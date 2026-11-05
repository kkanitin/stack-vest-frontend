import type { Goal } from '../../api/goals';
import { projectGoal, requiredMonthlyAmount } from './math';
import {
  goalPlanInputs,
  goalPlanToDate,
  goalProgress,
  monthsBetween,
  ON_TRACK_TOLERANCE_PCT,
  planValueAt,
} from './progress';

/** A local date as the ISO string the backend sends. */
const iso = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).toISOString();
const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'g1',
    name: 'House',
    kind: 'projection',
    currency: 'THB',
    startingAmount: 100_000,
    monthlyAmount: 10_000,
    targetAmount: null,
    years: 10,
    expectedReturn: 6,
    contributionGrowth: null,
    inflation: 3,
    portfolioId: 'p1',
    createdAt: iso(2026, 1, 15),
    updatedAt: iso(2026, 1, 15),
    ...overrides,
  };
}

describe('monthsBetween', () => {
  it('counts a month once its day of the month is reached', () => {
    expect(monthsBetween(day(2026, 1, 15), day(2026, 2, 14))).toBe(0);
    expect(monthsBetween(day(2026, 1, 15), day(2026, 2, 15))).toBe(1);
    expect(monthsBetween(day(2026, 1, 15), day(2027, 3, 20))).toBe(14);
  });

  it('handles month ends (31 Jan → 28 Feb is not yet a month)', () => {
    expect(monthsBetween(day(2026, 1, 31), day(2026, 2, 28))).toBe(0);
    expect(monthsBetween(day(2026, 1, 31), day(2026, 3, 1))).toBe(1);
  });

  it('is 0 on the same day and never negative', () => {
    expect(monthsBetween(day(2026, 1, 15), day(2026, 1, 15))).toBe(0);
    expect(monthsBetween(day(2026, 5, 1), day(2026, 1, 1))).toBe(0);
  });
});

describe('planValueAt', () => {
  const inputs = { startingAmount: 1_000, monthlyAmount: 100, years: 2, annualReturnPct: 12, contributionGrowthPct: 10 };

  it('is the starting amount at month 0', () => {
    expect(planValueAt(inputs, 0)).toBe(1_000);
  });

  it('compounds monthly and adds each payment at month end', () => {
    // Two months at 1%: (1000·1.01 + 100)·1.01 + 100
    expect(planValueAt(inputs, 2)).toBeCloseTo((1_000 * 1.01 + 100) * 1.01 + 100, 8);
  });

  it('applies the yearly increase from month 13', () => {
    const after12 = planValueAt(inputs, 12);
    expect(planValueAt(inputs, 13)).toBeCloseTo(after12 * 1.01 + 110, 8);
  });

  it('is capped at the final value once the plan is over', () => {
    const final = projectGoal(inputs).finalValue;
    expect(planValueAt(inputs, 24)).toBeCloseTo(final, 8);
    expect(planValueAt(inputs, 500)).toBeCloseTo(final, 8);
  });

  it('ignores part months and negative counts', () => {
    expect(planValueAt(inputs, 2.9)).toBe(planValueAt(inputs, 2));
    expect(planValueAt(inputs, -3)).toBe(1_000);
  });
});

describe('goalPlanInputs', () => {
  it('projection mode uses the monthly amount', () => {
    expect(goalPlanInputs(goal())).toEqual({
      startingAmount: 100_000,
      monthlyAmount: 10_000,
      years: 10,
      annualReturnPct: 6,
      contributionGrowthPct: 0,
    });
  });

  it('target mode uses the monthly amount needed', () => {
    const g = goal({ kind: 'target', monthlyAmount: null, targetAmount: 2_000_000 });
    const needed = requiredMonthlyAmount({
      startingAmount: 100_000,
      targetAmount: 2_000_000,
      years: 10,
      annualReturnPct: 6,
      contributionGrowthPct: 0,
    });
    expect(goalPlanInputs(g)?.monthlyAmount).toBeCloseTo(needed!, 8);
  });

  it('target already met by the starting amount pays 0 a month', () => {
    const g = goal({ kind: 'target', targetAmount: 50_000 });
    expect(goalPlanInputs(g)?.monthlyAmount).toBe(0);
  });

  it('is null when the target cannot be reached or an amount is missing', () => {
    // No months to save in: no monthly amount reaches the target.
    expect(goalPlanInputs(goal({ kind: 'target', targetAmount: 1e9, years: 0 }))).toBeNull();
    expect(goalPlanInputs(goal({ kind: 'target', targetAmount: null }))).toBeNull();
    expect(goalPlanInputs(goal({ monthlyAmount: null }))).toBeNull();
  });
});

describe('goalPlanToDate', () => {
  it('a goal created today is at its starting amount', () => {
    const plan = goalPlanToDate(goal(), day(2026, 1, 15));
    expect(plan).toEqual({ monthsElapsed: 0, totalMonths: 120, planValue: 100_000, monthlyAmount: 10_000 });
  });

  it('projection mode: the plan value after the months elapsed', () => {
    const plan = goalPlanToDate(goal(), day(2027, 1, 20))!;
    expect(plan.monthsElapsed).toBe(12);
    expect(plan.planValue).toBeCloseTo(
      projectGoal({ startingAmount: 100_000, monthlyAmount: 10_000, years: 1, annualReturnPct: 6 }).finalValue,
      6,
    );
  });

  it('target mode: follows the plan at the monthly amount needed', () => {
    const g = goal({ kind: 'target', monthlyAmount: null, targetAmount: 2_000_000 });
    const plan = goalPlanToDate(g, day(2028, 1, 15))!;
    expect(plan.monthsElapsed).toBe(24);
    expect(plan.planValue).toBeCloseTo(
      planValueAt({ startingAmount: 100_000, monthlyAmount: plan.monthlyAmount, years: 10, annualReturnPct: 6 }, 24),
      6,
    );
  });

  it('target mode lands on the target at the end', () => {
    const g = goal({ kind: 'target', monthlyAmount: null, targetAmount: 2_000_000 });
    expect(goalPlanToDate(g, day(2036, 1, 15))!.planValue).toBeCloseTo(2_000_000, 4);
  });

  it('a goal past its end date is at its final value', () => {
    const plan = goalPlanToDate(goal(), day(2040, 6, 1))!;
    expect(plan.monthsElapsed).toBe(120);
    expect(plan.planValue).toBeCloseTo(
      projectGoal({ startingAmount: 100_000, monthlyAmount: 10_000, years: 10, annualReturnPct: 6 }).finalValue,
      6,
    );
  });

  it('starts from createdAt, never updatedAt', () => {
    const g = goal({ updatedAt: iso(2027, 1, 15) });
    expect(goalPlanToDate(g, day(2027, 1, 15))!.monthsElapsed).toBe(12);
  });

  it('stays in future money: inflation does not change the plan value', () => {
    const a = goalPlanToDate(goal({ inflation: 0 }), day(2030, 1, 15))!;
    const b = goalPlanToDate(goal({ inflation: 10 }), day(2030, 1, 15))!;
    expect(a.planValue).toBe(b.planValue);
  });

  it('is null for an unreachable target or a bad start date', () => {
    expect(goalPlanToDate(goal({ kind: 'target', targetAmount: 1e9, years: 0 }))).toBeNull();
    expect(goalPlanToDate(goal({ createdAt: 'not a date' }))).toBeNull();
  });
});

describe('goalProgress', () => {
  it('is on track within ±2% of the plan, edges included', () => {
    expect(goalProgress(100_000, 100_000)?.status).toBe('on-track');
    expect(goalProgress(102_000, 100_000)?.status).toBe('on-track');
    expect(goalProgress(98_000, 100_000)?.status).toBe('on-track');
    expect(ON_TRACK_TOLERANCE_PCT).toBe(2);
  });

  it('is ahead or behind just outside the band', () => {
    expect(goalProgress(102_001, 100_000)?.status).toBe('ahead');
    expect(goalProgress(97_999, 100_000)?.status).toBe('behind');
  });

  it('gives the signed gap and percentages', () => {
    expect(goalProgress(87_600, 100_000, 400_000)).toEqual({
      status: 'behind',
      gap: -12_400,
      percentOfPlan: 87.6,
      percentOfTarget: 21.9,
    });
    expect(goalProgress(120_000, 100_000)).toMatchObject({ status: 'ahead', gap: 20_000, percentOfTarget: null });
  });

  it('a zero plan: zero is on track, anything above is ahead, no percent of plan', () => {
    expect(goalProgress(0, 0)).toMatchObject({ status: 'on-track', gap: 0, percentOfPlan: null });
    expect(goalProgress(10, 0)).toMatchObject({ status: 'ahead', percentOfPlan: null });
  });

  it('a zero or negative actual value is behind a positive plan', () => {
    expect(goalProgress(0, 50_000)).toMatchObject({ status: 'behind', gap: -50_000, percentOfPlan: 0 });
    expect(goalProgress(-500, 50_000)?.status).toBe('behind');
  });

  it('no percent of target without a positive target', () => {
    expect(goalProgress(1, 1, 0)?.percentOfTarget).toBeNull();
    expect(goalProgress(1, 1, null)?.percentOfTarget).toBeNull();
  });

  it('no status without an actual or a plan value', () => {
    expect(goalProgress(null, 100)).toBeNull();
    expect(goalProgress(undefined, 100)).toBeNull();
    expect(goalProgress(100, null)).toBeNull();
    expect(goalProgress(NaN, 100)).toBeNull();
    expect(goalProgress(100, Infinity)).toBeNull();
  });
});
