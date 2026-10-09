import type { ValuePoint } from '../api/portfolios';

export interface PctChangeRow {
  date: string;
  value: number;
  returnPct: number;
  /** Time-weighted portfolio return since the base row, in percent (money added or withdrawn excluded). */
  portfolioPct: number;
  /** Benchmark close change since the base row, in percent. */
  benchmarkPct: number;
}

function hasClose(p: ValuePoint): p is ValuePoint & { benchmarkClose: number } {
  return typeof p.benchmarkClose === 'number' && Number.isFinite(p.benchmarkClose) && p.benchmarkClose > 0;
}

/**
 * The portfolio line uses the backend's cumulative time-weighted `returnPct`, rebased so the base
 * day is 0%; the benchmark line is its close change from the same day. Rebases both series to 0% at the first day the portfolio has value and the benchmark has a
 * close (positive, with return above -100%); earlier days are dropped. Rows after the base whose close is missing are dropped too,
 * since a percent cannot be drawn for them. Returns [] when there is no such base day.
 */
export function pctChangeSeries(points: ValuePoint[]): PctChangeRow[] {
  const baseIdx = points.findIndex(p => p.value > 0 && hasClose(p) && 100 + p.returnPct > 0);
  if (baseIdx < 0) return [];
  const base = points[baseIdx] as ValuePoint & { benchmarkClose: number };
  const rows: PctChangeRow[] = [];
  for (const p of points.slice(baseIdx)) {
    if (!hasClose(p)) continue;
    rows.push({
      date: p.date,
      value: p.value,
      returnPct: p.returnPct,
      portfolioPct: ((100 + p.returnPct) / (100 + base.returnPct) - 1) * 100,
      benchmarkPct: (p.benchmarkClose / base.benchmarkClose - 1) * 100,
    });
  }
  return rows;
}
