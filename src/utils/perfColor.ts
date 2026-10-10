// Phase 1: 8–55% opacity range (vivid vs. old 6–28%).
export function intensity(pct: number): number {
  return 0.08 + Math.min(Math.abs(pct) / 5, 1) * 0.47;
}

/** Colour-scale clamp per heatmap period: a move this large or larger gets the strongest colour. */
export const PERIOD_CLAMP = { '1D': 3, '1W': 6, '1M': 10, YTD: 30 } as const;

/**
 * Buckets a percentage change into a stepped diverging scale, -3 (deep red) to
 * +3 (deep green), with 0 for a flat move. Each step is a third of `clamp`.
 */
export function perfLevel(pct: number | null, clamp: number): number {
  if (pct === null || !Number.isFinite(pct)) return 0;
  const step = clamp / 3;
  if (Math.abs(pct) < step / 10) return 0;
  return Math.sign(pct) * Math.min(Math.ceil(Math.abs(pct) / step), 3);
}
