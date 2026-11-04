import {
  projectGoal,
  projectRange,
  requiredMonthlyRange,
  returnRange,
  toTodaysMoney,
  type GoalRange,
} from './goalMath';
import type { ParsedGoal } from './goalInputs';

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
  const base: GoalResultBase = {
    currency: goal.currency,
    years: goal.years,
    inflationPct: goal.inflationPct,
    todaysMoney,
    returns: returnRange(goal.projection.annualReturnPct),
  };

  if (goal.kind === 'projection') {
    const deflate = (n: number) => (todaysMoney ? toTodaysMoney(n, goal.years, goal.inflationPct) : n);
    const r = projectRange(goal.projection);
    const expected = r.expected;
    return {
      ...base,
      kind: 'projection',
      headline: deflate(expected.finalValue),
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
  const figures = monthly == null ? null : projectGoal({ ...goal.projection, monthlyAmount: monthly });
  return {
    ...base,
    kind: 'target',
    headline: monthly,
    figures,
    range,
    targetAmount,
    targetNominal,
  };
}
