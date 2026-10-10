import type { DcaDataPoint } from '../api/simulations';

export interface LumpSumResult {
  /** Lump-sum portfolio value at each data point's date, same length as the input. */
  values: number[];
  finalValue: number;
  returnPct: number;
  /** Lump sum minus DCA, in dollars. Positive means the lump sum did better. */
  diff: number;
  /** The same difference as a share of the amount invested (percentage points of return). */
  diffPct: number;
  better: 'lump' | 'dca' | 'tie';
}

/**
 * What the same money would be worth invested in one go: the DCA plan's total, bought at
 * the first purchase's price and valued at each later price. Price movement only, like the
 * DCA figures. Returns null when there is nothing to compare.
 */
export function computeLumpSum(points: DcaDataPoint[]): LumpSumResult | null {
  if (points.length === 0) return null;
  const first = points[0];
  const last = points[points.length - 1];
  const invested = last.totalInvested;
  if (first.price <= 0 || invested <= 0) return null;

  const units = invested / first.price;
  const values = points.map(p => units * p.price);
  const finalValue = values[values.length - 1];
  const diff = finalValue - last.portfolioValue;

  return {
    values,
    finalValue,
    returnPct: ((finalValue - invested) / invested) * 100,
    diff,
    diffPct: (diff / invested) * 100,
    better: Math.abs(diff) < 0.005 ? 'tie' : diff > 0 ? 'lump' : 'dca',
  };
}
