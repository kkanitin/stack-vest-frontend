/**
 * Monte Carlo simulation of a goal plan: many possible paths instead of one steady return,
 * for the chance of reaching a target and the spread of outcomes (KAN-33).
 *
 * It follows the conventions of `goalMath.ts`: rates are percentages as typed, steps are
 * monthly, each monthly amount is added at the end of its month, and the monthly amount
 * rises once a year by the yearly increase.
 *
 * Returns are lognormal. Each month the balance grows by `f · e^(σ·Z)`, where
 * `f = 1 + annualReturn/12` is the deterministic monthly factor from `goalMath`,
 * `σ = annualVolatility / √12` and `Z` is standard normal.
 *
 * - **Median, not mean.** `e^(σZ)` has median 1, so the median growth over any number of
 *   months is exactly `f^n`, the deterministic plan. A lump sum's median therefore matches
 *   `projectGoal` at the expected return. The *mean* is higher by `e^(σ²/2)` a month. That
 *   gap is volatility drag: the typical outcome stays at the plan while a few lucky paths
 *   pull the average up. Matching the median keeps the chart's middle line next to the
 *   deterministic headline.
 * - **With monthly amounts** the final value is a sum of lognormal amounts, which is
 *   right-skewed, so its median sits a little *above* the plan. Over 20 years that is about
 *   1% at 10% volatility, 4% at 20% and 10% at 30%. Saving exactly the "monthly amount
 *   needed" therefore gives slightly better than even odds (about 51–54%). Removing the gap
 *   would mean calibrating the drift per input with several extra runs, which is too slow
 *   for typing, so it is left as is.
 * - **Volatility** is the annualised standard deviation of monthly log returns, the same
 *   basis as the backend's suggested-return `annualVolatility`.
 * - **Volatility 0** gives `e^0 = 1` exactly, so every path equals `goalSeries`.
 *
 * Randomness is seeded (mulberry32), so the same inputs always give the same figures. That
 * keeps tests stable and stops numbers jumping while the user types. Normal draws come from
 * a table of `NORMAL_TABLE_SIZE` normal quantiles (inverse CDF at evenly spaced
 * probabilities, rescaled to unit variance), indexed by the PRNG's top bits. Box–Muller
 * needs a log, a square root and a cosine per draw plus an `exp` per step, which took about
 * 60 ms for 100 years × 2,000 paths. The table needs one multiply per step (about 10 ms), so
 * the work fits in a frame without a Web Worker. A single month's tails beyond about ±3.5σ
 * are cut off, which barely matters over a horizon of years.
 */
import { monthlyFactor, toMonths, type GoalRange, type ProjectionInputs } from './goalMath';
import type { GoalChartPoint } from './goalChart';

/** Number of simulated paths by default. */
export const SIMULATION_PATHS = 2000;
/** Default seed, so the same inputs always give the same result. */
export const SIMULATION_SEED = 0x5eed;
/** Percentiles reported as the low, middle and high of the band. */
export const SIMULATION_PERCENTILES: GoalRange<number> = { low: 10, expected: 50, high: 90 };

const NORMAL_TABLE_BITS = 12;
export const NORMAL_TABLE_SIZE = 1 << NORMAL_TABLE_BITS;

export interface SimulationOptions {
  /** Expected annual return, in percent. */
  annualReturnPct: number;
  /** Annual volatility in percent (standard deviation of log returns), 0 or more. */
  annualVolatilityPct: number;
  paths?: number;
  seed?: number;
}

export interface GoalSimulation {
  paths: number;
  /** The percentiles used for `series` and `final`. */
  percentiles: GoalRange<number>;
  /**
   * Yearly points (year 0, every whole year, and a part year at the end), with the value at
   * the low / middle / high percentiles. Same shape and years as `goalChartPoints`.
   */
  series: GoalChartPoint[];
  /** Final value at the low / middle / high percentiles. */
  final: GoalRange<number>;
  /** Share (0–1) of paths whose final value is at least `target`. */
  probabilityOfReaching(target: number): number;
}

/** mulberry32: a small, fast seeded PRNG giving 32-bit unsigned integers. */
function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t ^ (t >>> 14)) >>> 0;
  };
}

const A = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
const B = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
const C = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
const D = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
const P_LOW = 0.02425;

function normalTail(q: number): number {
  return (
    (((((C[0] * q + C[1]) * q + C[2]) * q + C[3]) * q + C[4]) * q + C[5]) /
    ((((D[0] * q + D[1]) * q + D[2]) * q + D[3]) * q + 1)
  );
}

/** Inverse of the standard normal CDF for 0 < p < 1 (Acklam's approximation, error < 1.2e-9). */
export function inverseNormalCdf(p: number): number {
  if (p < P_LOW) return normalTail(Math.sqrt(-2 * Math.log(p)));
  if (p > 1 - P_LOW) return -normalTail(Math.sqrt(-2 * Math.log(1 - p)));
  const q = p - 0.5;
  const r = q * q;
  return (
    ((((((A[0] * r + A[1]) * r + A[2]) * r + A[3]) * r + A[4]) * r + A[5]) * q) /
    (((((B[0] * r + B[1]) * r + B[2]) * r + B[3]) * r + B[4]) * r + 1)
  );
}

let normalTable: Float64Array | null = null;

/** Normal quantiles at the middle of `NORMAL_TABLE_SIZE` equal slices, scaled to variance 1. */
function standardNormalTable(): Float64Array {
  if (normalTable) return normalTable;
  const t = new Float64Array(NORMAL_TABLE_SIZE);
  let sumSq = 0;
  for (let i = 0; i < NORMAL_TABLE_SIZE; i++) {
    t[i] = inverseNormalCdf((i + 0.5) / NORMAL_TABLE_SIZE);
    sumSq += t[i] * t[i];
  }
  // Symmetric, so the mean is 0; rescale so the variance is exactly 1.
  const scale = 1 / Math.sqrt(sumSq / NORMAL_TABLE_SIZE);
  for (let i = 0; i < NORMAL_TABLE_SIZE; i++) t[i] *= scale;
  normalTable = t;
  return t;
}

/** Value at percentile `pct` (0–100) of an ascending array, interpolating between ranks. */
export function percentileOfSorted(sorted: ArrayLike<number>, pct: number): number {
  const n = sorted.length;
  if (n === 0) return NaN;
  const rank = (pct / 100) * (n - 1);
  const lo = Math.floor(rank);
  const hi = Math.min(n - 1, lo + 1);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (rank - lo);
}

function rangeOf(sorted: Float64Array, pcts: GoalRange<number>): GoalRange<number> {
  return {
    low: percentileOfSorted(sorted, pcts.low),
    expected: percentileOfSorted(sorted, pcts.expected),
    high: percentileOfSorted(sorted, pcts.high),
  };
}

/**
 * Simulates `inputs` along `paths` random paths. `inputs.annualReturnPct` is ignored in
 * favour of `options.annualReturnPct`, so one set of inputs can be simulated at any return.
 */
export function simulateGoalPaths(inputs: ProjectionInputs, options: SimulationOptions): GoalSimulation {
  const paths = Math.max(1, Math.floor(options.paths ?? SIMULATION_PATHS));
  const months = toMonths(inputs.years);
  const sigma = Math.max(0, options.annualVolatilityPct) / 100 / Math.sqrt(12);
  const f = monthlyFactor(options.annualReturnPct);
  const growth = 1 + (inputs.contributionGrowthPct ?? 0) / 100;

  // The monthly growth factor for each table entry: f · e^(σ·z).
  const z = standardNormalTable();
  const factors = new Float64Array(NORMAL_TABLE_SIZE);
  for (let i = 0; i < NORMAL_TABLE_SIZE; i++) factors[i] = f * Math.exp(sigma * z[i]);

  const next = mulberry32(options.seed ?? SIMULATION_SEED);
  const shift = 32 - NORMAL_TABLE_BITS;
  const values = new Float64Array(paths).fill(inputs.startingAmount);
  let invested = inputs.startingAmount;

  const series: GoalChartPoint[] = [];
  const record = (year: number): Float64Array => {
    const sorted = values.slice().sort();
    series.push({ year, invested, value: rangeOf(sorted, SIMULATION_PERCENTILES) });
    return sorted;
  };
  let final = record(0);

  for (let m = 0; m < months; m++) {
    const payment = inputs.monthlyAmount * growth ** Math.floor(m / 12);
    for (let p = 0; p < paths; p++) {
      values[p] = values[p] * factors[next() >>> shift] + payment;
    }
    invested += payment;
    const done = m + 1;
    if (done % 12 === 0 || done === months) final = record(done / 12);
  }

  return {
    paths,
    percentiles: SIMULATION_PERCENTILES,
    series,
    final: rangeOf(final, SIMULATION_PERCENTILES),
    probabilityOfReaching(target: number): number {
      // The first index whose value is ≥ target, by binary search on the ascending finals.
      let lo = 0;
      let hi = final.length;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (final[mid] < target) lo = mid + 1;
        else hi = mid;
      }
      return (final.length - lo) / final.length;
    },
  };
}
