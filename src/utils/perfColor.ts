// Phase 1: 8–55% opacity range (vivid vs. old 6–28%).
export function intensity(pct: number): number {
  return 0.08 + Math.min(Math.abs(pct) / 5, 1) * 0.47;
}
