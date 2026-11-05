import { formatFullDate } from '../../utils/timeAxis';

export interface ChartPoint {
  date: string;
  invested: number;
  value: number;
  /** Lump-sum value at this date; present on every point or none. */
  lump?: number;
}

function money(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

/** One-sentence text alternative for the chart. */
export function describeChart(points: ChartPoint[]): string {
  if (points.length === 0) return 'Portfolio growth chart: no data.';
  const first = points[0];
  const last = points[points.length - 1];
  const peak = points.reduce((best, p) => (p.value > best.value ? p : best), first);
  return (
    `Portfolio growth from ${formatFullDate(first.date)} to ${formatFullDate(last.date)}. ` +
    `Invested ${money(last.invested)}; final value ${money(last.value)}. ` +
    `Highest value ${money(peak.value)} on ${formatFullDate(peak.date)}.` +
    (last.lump === undefined ? '' : ` A lump sum of the same total would end at ${money(last.lump)}.`)
  );
}
