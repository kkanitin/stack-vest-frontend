import type { HistoryPoint } from '../api/stocks';

export function normalizeBase100(points: HistoryPoint[]): HistoryPoint[] {
  if (!points.length) return [];
  const base = points[0].close;
  if (base === 0) return points;
  return points.map(p => ({ ...p, close: (p.close / base) * 100 }));
}
