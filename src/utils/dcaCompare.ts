import type { DcaResult } from '../api/simulations';
import { formatFullDate } from './dcaChart';

export interface CompareSeries {
  symbol: string;
  color: string;
  /** Percentage return after each data point, ascending by date. */
  points: { date: string; pct: number }[];
}

/** One colour per asset slot; the comparison is capped at three assets. */
export const SERIES_COLORS = ['var(--primary)', 'var(--chart-lump, #d97706)', 'var(--chart-third, #7c3aed)'];

export function toSeries(results: DcaResult[]): CompareSeries[] {
  return results.map((r, i) => ({
    symbol: r.symbol,
    color: SERIES_COLORS[i % SERIES_COLORS.length],
    points: r.dataPoints.map(dp => ({ date: dp.date, pct: dp.returnPct })),
  }));
}

/** Every date any series has a point on, ascending and de-duplicated. */
export function unionDates(series: CompareSeries[]): string[] {
  return [...new Set(series.flatMap(s => s.points.map(p => p.date)))].sort();
}

/** The series' return as of `date`: its latest point on or before it, or undefined before its first point. */
export function pctAt(series: CompareSeries, date: string): number | undefined {
  let found: number | undefined;
  for (const p of series.points) {
    if (p.date > date) break;
    found = p.pct;
  }
  return found;
}

function pct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

/** One-sentence text alternative for the comparison chart. */
export function describeCompare(series: CompareSeries[]): string {
  const dates = unionDates(series);
  if (dates.length === 0) return 'Return comparison chart: no data.';
  const ends = series
    .map(s => `${s.symbol} ${pct(s.points[s.points.length - 1].pct)}`)
    .join(', ');
  return `Percentage return from ${formatFullDate(dates[0])} to ${formatFullDate(dates[dates.length - 1])}. Final returns: ${ends}.`;
}
