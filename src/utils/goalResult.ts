import {
  projectGoal,
  projectRange,
  requiredMonthlyAmount,
  requiredMonthlyRange,
  returnRange,
  toTodaysMoney,
  type GoalRange,
} from './goalMath';
import type { ParsedGoal } from './goalInputs';
import { goalChartPoints, type GoalChartPoint } from './goalChart';

/** Goals shorter than this many years get the short-goal notice comparing the plan with cash. */
export const SHORT_GOAL_YEARS = 5;

/**
 * The plan at the expected return next to the same plan at a 0% return (keeping cash), on
 * the same money basis as the headline. Projection mode compares final values; target mode
 * compares monthly amounts needed.
 */
export interface CashComparison {
  /** The headline figure at the expected return; null when no monthly amount reaches the target. */
  invested: number | null;
  /** The same figure at a 0% return. */
  cash: number;
  /**
   * What investing gains over cash: the extra final value (projection) or the monthly amount
   * saved (target). Negative when the expected return does worse than cash; null when
   * `invested` is null.
   */
  benefit: number | null;
}

export interface GoalFigures {
  finalValue: number;
  totalInvested: number;
  gain: number;
}

interface GoalResultBase {
  currency: string;
  years: number;
  inflationPct: number;
  todaysMoney: boolean;
  /** The low / expected / high annual returns, in percent. */
  returns: GoalRange<number>;
  /**
   * Yearly points for the growth chart, on the same money basis as `figures`; null when there
   * is no plan to draw (an unreachable target).
   */
  chart: GoalChartPoint[] | null;
  /** Plan versus cash, only for goals under `SHORT_GOAL_YEARS`; null otherwise. */
  cashComparison: CashComparison | null;
}

export interface ProjectionResult extends GoalResultBase {
  kind: 'projection';
  /** Final value at the expected return. */
  headline: number;
  figures: GoalFigures;
  /** Final value at each return. */
  range: GoalRange<number>;
}

export interface TargetResult extends GoalResultBase {
  kind: 'target';
  /** Monthly amount needed at the expected return; null when no amount can reach the target. */
  headline: number | null;
  /** The plan at that monthly amount; null when the target cannot be reached. */
  figures: GoalFigures | null;
  /** Monthly amount needed at each return (low return → largest amount). */
  range: GoalRange<number | null>;
  /** The target as typed. */
  targetAmount: number;
  /** The amount actually aimed for: the target grown by inflation when it is in today's money. */
  targetNominal: number;
}

export type GoalResult = ProjectionResult | TargetResult;

/**
 * Everything the goal page shows, from validated inputs.
 *
 * Today's money works differently in each mode, so that each figure answers a real question:
 * - projection: every amount at the end of the plan is divided by `(1 + inflation)^years`,
 *   i.e. what it would buy today;
 * - target: the target is taken as today's money and grown by inflation to the plan's end,
 *   so the monthly amount needed is what the user actually pays. Other amounts stay as
 *   future money.
 */
export function computeGoalResult(goal: ParsedGoal, todaysMoney: boolean): GoalResult {
  const returns = returnRange(goal.projection.annualReturnPct);
  const short = goal.years < SHORT_GOAL_YEARS;
  const base: Omit<GoalResultBase, 'chart' | 'cashComparison'> = {
    currency: goal.currency,
    years: goal.years,
    inflationPct: goal.inflationPct,
    todaysMoney,
    returns,
  };

  if (goal.kind === 'projection') {
    const deflate = (n: number) => (todaysMoney ? toTodaysMoney(n, goal.years, goal.inflationPct) : n);
    const r = projectRange(goal.projection);
    const expected = r.expected;
    const headline = deflate(expected.finalValue);
    let cashComparison: CashComparison | null = null;
    if (short) {
      const cash = deflate(projectGoal({ ...goal.projection, annualReturnPct: 0 }).finalValue);
      cashComparison = { invested: headline, cash, benefit: headline - cash };
    }
    return {
      ...base,
      kind: 'projection',
      cashComparison,
      chart: goalChartPoints(goal.projection, returns, todaysMoney ? goal.inflationPct : undefined),
      headline,
      figures: {
        finalValue: deflate(expected.finalValue),
        totalInvested: deflate(expected.totalInvested),
        gain: deflate(expected.gain),
      },
      range: {
        low: deflate(r.low.finalValue),
        expected: deflate(r.expected.finalValue),
        high: deflate(r.high.finalValue),
      },
    };
  }

  const targetAmount = goal.target.targetAmount;
  const targetNominal = todaysMoney
    ? targetAmount * (1 + goal.inflationPct / 100) ** goal.years
    : targetAmount;
  const range = requiredMonthlyRange({ ...goal.target, targetAmount: targetNominal });
  const monthly = range.expected;
  const plan = monthly == null ? null : { ...goal.projection, monthlyAmount: monthly };
  const figures = plan && projectGoal(plan);
  let cashComparison: CashComparison | null = null;
  if (short) {
    // At 0% every payment counts in full, so cash only fails with no months to save in.
    const cash = requiredMonthlyAmount({ ...goal.target, targetAmount: targetNominal, annualReturnPct: 0 });
    if (cash != null) {
      cashComparison = { invested: monthly, cash, benefit: monthly == null ? null : cash - monthly };
    }
  }
  return {
    ...base,
    kind: 'target',
    cashComparison,
    // Future money, like the other target-mode amounts; the chart's target line is `targetNominal`.
    chart: plan && goalChartPoints(plan, returns),
    headline: monthly,
    figures,
    range,
    targetAmount,
    targetNominal,
  };
}
