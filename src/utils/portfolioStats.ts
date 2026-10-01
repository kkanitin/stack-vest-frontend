import type { PortfolioPosition } from '../api/portfolio';

/** Sum of every holding's current USD value. */
export function totalNetValue(positions: PortfolioPosition[]): number {
  return positions.reduce((sum, p) => sum + (Number.isFinite(p.valueUsd) ? p.valueUsd : 0), 0);
}

/**
 * Dollar change behind a percentage change: `totalValue` is the value now and
 * `changePct` how far it moved to get there. Returns null when there is no value to
 * measure against or the percentage cannot be inverted (a total loss, -100%).
 */
export function changeUsdFromPct(totalValue: number, changePct: number): number | null {
  if (!(totalValue > 0) || !Number.isFinite(changePct) || changePct <= -100) return null;
  return totalValue - totalValue / (1 + changePct / 100);
}

export interface Change24h {
  /** Aggregate 24h change in USD across valued holdings. */
  deltaUsd: number;
  /** Aggregate 24h change as a percentage of yesterday's value. */
  pct: number;
  /** False when no holding had a usable value/change to aggregate. */
  hasData: boolean;
}

/**
 * Derives a portfolio-level 24h figure from per-position current value + 24h %.
 * The API exposes no portfolio-level 24h number, so we reconstruct yesterday's value
 * (`valueUsd / (1 + change24h/100)`) per holding and aggregate.
 */
export function change24h(positions: PortfolioPosition[]): Change24h {
  let prevTotal = 0;
  let curTotal = 0;
  let hasData = false;
  for (const p of positions) {
    if (!(p.valueUsd > 0) || !Number.isFinite(p.change24h) || p.change24h <= -100) continue;
    prevTotal += p.valueUsd / (1 + p.change24h / 100);
    curTotal += p.valueUsd;
    hasData = true;
  }
  const deltaUsd = curTotal - prevTotal;
  const pct = prevTotal > 0 ? (deltaUsd / prevTotal) * 100 : 0;
  return { deltaUsd, pct, hasData };
}
