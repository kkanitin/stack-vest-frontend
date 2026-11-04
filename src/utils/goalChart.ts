import { goalSeries, toTodaysMoney, type GoalRange, type ProjectionInputs } from './goalMath';
import { fmtAmount } from './format';

/** One point of the goal growth chart: a year, the amount invested by then and the value at each return. */
export interface GoalChartPoint {
  /** Years from today; 0 is the starting amount. The last point may be a part year. */
  year: number;
  invested: number;
  value: GoalRange<number>;
}

/**
 * Yearly points of the plan at the low, expected and high returns. All three share the same
 * months and payments, so their years and amounts invested line up.
 *
 * With `deflateInflationPct` set, each amount is divided by `(1 + inflation)^year` for its own
 * year — what it would buy today. The last point uses `inputs.years` as given rather than the
 * whole months the maths rounds to, so it matches the page's headline figures exactly.
 */
export function goalChartPoints(
  inputs: ProjectionInputs,
  returns: GoalRange<number>,
  deflateInflationPct?: number,
): GoalChartPoint[] {
  const low = goalSeries({ ...inputs, annualReturnPct: returns.low });
  const expected = goalSeries({ ...inputs, annualReturnPct: returns.expected });
  const high = goalSeries({ ...inputs, annualReturnPct: returns.high });

  const lastIndex = expected.length - 1;
  return expected.map((p, i) => {
    const deflate = (n: number) =>
      deflateInflationPct === undefined
        ? n
        : toTodaysMoney(n, i === lastIndex ? inputs.years : p.year, deflateInflationPct);
    return {
      year: p.year,
      invested: deflate(p.invested),
      value: {
        low: deflate(low[i].value),
        expected: deflate(p.value),
        high: deflate(high[i].value),
      },
    };
  });
}

const NICE_STEPS = [1, 2, 5, 10, 20, 25, 50, 100];

/**
 * Whole years to label on the x-axis: 0 and multiples of a round step, at most `maxLabels`
 * of them. Fewer labels fit at phone width.
 */
export function yearTicks(totalYears: number, maxLabels: number): number[] {
  const end = Math.floor(totalYears);
  if (end <= 0) return [0];
  const intervals = Math.max(1, maxLabels - 1);
  const step = NICE_STEPS.find(s => end / s <= intervals) ?? Math.ceil(end / intervals);
  const ticks: number[] = [];
  for (let y = 0; y <= end; y += step) ticks.push(y);
  return ticks;
}

/** Axis label for a year: "Now" for 0, otherwise "Year 5". */
export function fmtYearLabel(year: number): string {
  return year === 0 ? 'Now' : `Year ${Number(year.toFixed(2))}`;
}

/** The smallest "round" number (1, 2, 2.5 or 5 × 10^k) at or above `n`; 1 for n ≤ 0. */
export function niceCeil(n: number): number {
  if (!(n > 0)) return 1;
  const pow = 10 ** Math.floor(Math.log10(n));
  const nice = [1, 2, 2.5, 5, 10].find(m => m * pow >= n * (1 - 1e-9)) ?? 10;
  return nice * pow;
}

/**
 * Y-axis gridline values from 0 up to at least `max`, on a round step (1, 2, 2.5 or 5 × 10^k),
 * about five intervals. The last value is the top of the axis.
 */
export function valueTicks(max: number): number[] {
  const step = niceCeil(max / 5);
  const count = Math.max(1, Math.ceil(max / step - 1e-9));
  return Array.from({ length: count + 1 }, (_, i) => step * i);
}

/** Short y-axis label without the currency: 950, 12k, 1.25M, 2B. */
export function fmtCompact(n: number): string {
  const units: [number, string][] = [[1e9, 'B'], [1e6, 'M'], [1e3, 'k']];
  for (const [size, suffix] of units) {
    if (Math.abs(n) >= size) return `${Number((n / size).toFixed(2))}${suffix}`;
  }
  return `${Math.round(n)}`;
}

function fmtYearSpan(years: number): string {
  const n = Number(years.toFixed(2));
  return `${n} ${n === 1 ? 'year' : 'years'}`;
}

/** One-sentence text alternative for the goal chart. */
export function describeGoalChart(points: GoalChartPoint[], currency: string, target?: number): string {
  if (points.length === 0) return 'Goal growth chart: no data.';
  const last = points[points.length - 1];
  const amount = (n: number) => fmtAmount(n, currency);
  return (
    `Goal growth over ${fmtYearSpan(last.year)}. ` +
    `Amount invested ${amount(last.invested)}; expected final value ${amount(last.value.expected)} ` +
    `(low ${amount(last.value.low)}, high ${amount(last.value.high)}).` +
    (target === undefined ? '' : ` Target ${amount(target)}.`)
  );
}
