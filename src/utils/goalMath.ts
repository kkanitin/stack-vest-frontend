/**
 * Goal maths shared by the goal page, its chart and saved goals, so they all agree.
 *
 * Conventions:
 * - Rates are percentages (8 means 8%), as typed in the form.
 * - Compounding is monthly at the annual return / 12, with each monthly amount added at
 *   the end of its month: `FV = PV·(1+r)^n + PMT·((1+r)^n − 1)/r`.
 * - `years` is converted to whole months (rounded). Today's money uses `years` as given.
 * - Inputs are assumed finite; validating the form is the caller's job.
 */

/** How far below and above the expected return the low and high cases sit, in percentage points. */
export const RANGE_SPREAD_PCT = 2;

export interface ProjectionInputs {
  startingAmount: number;
  monthlyAmount: number;
  years: number;
  /** Expected annual return, in percent. May be zero or negative. */
  annualReturnPct: number;
  /** How much the monthly amount rises each year, in percent. Defaults to 0. */
  contributionGrowthPct?: number;
}

export interface TargetInputs {
  startingAmount: number;
  targetAmount: number;
  years: number;
  annualReturnPct: number;
  contributionGrowthPct?: number;
}

export interface GoalProjection {
  finalValue: number;
  /** Starting amount plus every monthly amount paid in. */
  totalInvested: number;
  /** finalValue − totalInvested. Negative when the return is negative. */
  gain: number;
}

export interface GoalSeriesPoint {
  /** Whole years from the start; 0 is the starting amount alone. */
  year: number;
  invested: number;
  value: number;
}

export interface GoalRange<T> {
  low: T;
  expected: T;
  high: T;
}

/** `years` as whole months (rounded), the step count every simulation uses. */
export function toMonths(years: number): number {
  return Math.max(0, Math.round(years * 12));
}

/** Monthly growth factor. A return of −1200% or worse would wipe the balance; it is floored at zero. */
export function monthlyFactor(annualReturnPct: number): number {
  return Math.max(0, 1 + annualReturnPct / 100 / 12);
}

/**
 * Month-by-month simulation. Calls `onYearEnd` after month 0 and every 12th month, plus a
 * final call for a part year. Works for any return, including 0% and negative, without the
 * closed form's division by r.
 */
function simulate(
  inputs: ProjectionInputs,
  onYearEnd?: (point: GoalSeriesPoint) => void,
): GoalProjection {
  const months = toMonths(inputs.years);
  const factor = monthlyFactor(inputs.annualReturnPct);
  const growth = 1 + (inputs.contributionGrowthPct ?? 0) / 100;

  let value = inputs.startingAmount;
  let invested = inputs.startingAmount;
  onYearEnd?.({ year: 0, invested, value });

  for (let m = 0; m < months; m++) {
    const payment = inputs.monthlyAmount * growth ** Math.floor(m / 12);
    value = value * factor + payment;
    invested += payment;
    const done = m + 1;
    if (done % 12 === 0 || done === months) {
      onYearEnd?.({ year: done / 12, invested, value });
    }
  }

  return { finalValue: value, totalInvested: invested, gain: value - invested };
}

/** What the plan is worth at the end of `years`. */
export function projectGoal(inputs: ProjectionInputs): GoalProjection {
  return simulate(inputs);
}

/**
 * Yearly points of amount invested and value, for the chart. Starts at year 0 (the starting
 * amount) and ends at `years`; a part year at the end gets its own point with a fractional `year`.
 */
export function goalSeries(inputs: ProjectionInputs): GoalSeriesPoint[] {
  const points: GoalSeriesPoint[] = [];
  simulate(inputs, p => points.push(p));
  return points;
}

/**
 * Monthly amount (in the first year, before any yearly rise) needed to reach `targetAmount`.
 * Returns 0 when the starting amount alone gets there, and null when no monthly amount can:
 * there are no months to save in, or the return wipes out every payment.
 */
export function requiredMonthlyAmount(inputs: TargetInputs): number | null {
  const base = {
    startingAmount: inputs.startingAmount,
    years: inputs.years,
    annualReturnPct: inputs.annualReturnPct,
    contributionGrowthPct: inputs.contributionGrowthPct,
  };
  // The final value is linear in the monthly amount: FV = fromStart + monthly · perUnit.
  const fromStart = simulate({ ...base, monthlyAmount: 0 }).finalValue;
  const shortfall = inputs.targetAmount - fromStart;
  if (shortfall <= 0) return 0;

  const perUnit = simulate({ ...base, startingAmount: 0, monthlyAmount: 1 }).finalValue;
  if (perUnit <= 0) return null;
  return shortfall / perUnit;
}

/** `amount` in today's money: divided by `(1 + inflation)^years`. */
export function toTodaysMoney(amount: number, years: number, inflationPct: number): number {
  const factor = (1 + inflationPct / 100) ** years;
  return factor > 0 ? amount / factor : amount;
}

/** The low, expected and high annual returns: expected ∓ `spreadPct` percentage points. */
export function returnRange(annualReturnPct: number, spreadPct = RANGE_SPREAD_PCT): GoalRange<number> {
  return {
    low: annualReturnPct - spreadPct,
    expected: annualReturnPct,
    high: annualReturnPct + spreadPct,
  };
}

/** `projectGoal` at the low, expected and high returns. */
export function projectRange(
  inputs: ProjectionInputs,
  spreadPct = RANGE_SPREAD_PCT,
): GoalRange<GoalProjection> {
  const r = returnRange(inputs.annualReturnPct, spreadPct);
  return {
    low: projectGoal({ ...inputs, annualReturnPct: r.low }),
    expected: projectGoal({ ...inputs, annualReturnPct: r.expected }),
    high: projectGoal({ ...inputs, annualReturnPct: r.high }),
  };
}

/**
 * `requiredMonthlyAmount` at the low, expected and high returns. A lower return needs more
 * each month, so `low` is the largest amount.
 */
export function requiredMonthlyRange(
  inputs: TargetInputs,
  spreadPct = RANGE_SPREAD_PCT,
): GoalRange<number | null> {
  const r = returnRange(inputs.annualReturnPct, spreadPct);
  return {
    low: requiredMonthlyAmount({ ...inputs, annualReturnPct: r.low }),
    expected: requiredMonthlyAmount({ ...inputs, annualReturnPct: r.expected }),
    high: requiredMonthlyAmount({ ...inputs, annualReturnPct: r.high }),
  };
}
