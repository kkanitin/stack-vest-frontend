import type { Goal } from '../api/goals';
import { projectGoal, requiredMonthlyAmount, type ProjectionInputs } from './goalMath';

/**
 * Goal progress: where the plan says a saved goal should be today (KAN-25).
 *
 * The plan starts on `goal.createdAt`, the only start date the backend stores. `updatedAt` is
 * never used: editing a goal must not move its start. Every figure is in future money (no
 * today's-money conversion) at the goal's expected return.
 */

/**
 * Whole calendar months from `start` to `today`: a month counts once its day of the month is
 * reached (31 Jan → 28 Feb is 0 months, → 1 Mar is 1). Never negative.
 */
export function monthsBetween(start: Date, today: Date): number {
  let months =
    (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth());
  if (today.getDate() < start.getDate()) months -= 1;
  return Math.max(0, months);
}

/** Expected value after `monthsElapsed` whole months of the plan, capped at the plan's length. */
export function planValueAt(inputs: ProjectionInputs, monthsElapsed: number): number {
  const total = Math.max(0, Math.round(inputs.years * 12));
  const months = Math.min(Math.max(0, Math.floor(monthsElapsed)), total);
  return projectGoal({ ...inputs, years: months / 12 }).finalValue;
}

export interface PlanToDate {
  /** Whole months since the goal was created, capped at `totalMonths`. */
  monthsElapsed: number;
  totalMonths: number;
  /** Where the plan says the goal should be after `monthsElapsed` months. */
  planValue: number;
  /** The monthly amount the plan pays in (target mode: the amount needed). */
  monthlyAmount: number;
}

/** The goal's inputs as numbers, with the monthly amount the plan uses; null when there is none. */
export function goalPlanInputs(goal: Goal): ProjectionInputs | null {
  const base = {
    startingAmount: goal.startingAmount ?? 0,
    years: goal.years,
    annualReturnPct: goal.expectedReturn,
    contributionGrowthPct: goal.contributionGrowth ?? 0,
  };
  if (goal.kind === 'target') {
    if (goal.targetAmount == null) return null;
    const monthly = requiredMonthlyAmount({ ...base, targetAmount: goal.targetAmount });
    return monthly == null ? null : { ...base, monthlyAmount: monthly };
  }
  if (goal.monthlyAmount == null) return null;
  return { ...base, monthlyAmount: goal.monthlyAmount };
}

/**
 * Where the plan says `goal` should be on `today`. Null when there is no plan value: the target
 * cannot be reached, an amount the mode needs is missing, or `createdAt` is not a date.
 */
export function goalPlanToDate(goal: Goal, today: Date = new Date()): PlanToDate | null {
  const inputs = goalPlanInputs(goal);
  const start = new Date(goal.createdAt);
  if (!inputs || Number.isNaN(start.getTime())) return null;
  const totalMonths = Math.max(0, Math.round(inputs.years * 12));
  const monthsElapsed = Math.min(monthsBetween(start, today), totalMonths);
  return {
    monthsElapsed,
    totalMonths,
    planValue: planValueAt(inputs, monthsElapsed),
    monthlyAmount: inputs.monthlyAmount,
  };
}

/**
 * How close to the plan counts as "on track", as a percentage of the plan value, so small
 * price moves do not flip the status (KAN-26). Inclusive at both edges.
 */
export const ON_TRACK_TOLERANCE_PCT = 2;

export type ProgressStatus = 'ahead' | 'on-track' | 'behind';

export interface GoalProgress {
  status: ProgressStatus;
  /** actual − plan, signed, in the goal's currency. */
  gap: number;
  /** actual / plan × 100; null when the plan value is 0 or less. */
  percentOfPlan: number | null;
  /** actual / target × 100 (target mode only); null when there is no positive target. */
  percentOfTarget: number | null;
}

/**
 * Compares the portfolio's value (`actual`, already in the goal's currency) with the plan value
 * today. Null — no status — when either value is missing or not a finite number.
 */
export function goalProgress(
  actual: number | null | undefined,
  plan: number | null | undefined,
  target?: number | null,
): GoalProgress | null {
  if (actual == null || plan == null || !Number.isFinite(actual) || !Number.isFinite(plan)) {
    return null;
  }
  const gap = actual - plan;
  const band = (Math.abs(plan) * ON_TRACK_TOLERANCE_PCT) / 100;
  const status: ProgressStatus = Math.abs(gap) <= band ? 'on-track' : gap > 0 ? 'ahead' : 'behind';
  return {
    status,
    gap,
    percentOfPlan: plan > 0 ? (actual / plan) * 100 : null,
    percentOfTarget: target != null && target > 0 ? (actual / target) * 100 : null,
  };
}
