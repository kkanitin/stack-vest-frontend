import type { PortfolioPosition } from '../api/portfolio';

export interface UnrealisedTotal {
  pnl: number;
  /** Percent of the open cost basis; null when there is no cost to measure against. */
  pct: number | null;
}

/** Sum of unrealised P&L across the open positions, and its percentage of their cost basis. */
export function totalUnrealisedPnl(open: PortfolioPosition[]): UnrealisedTotal {
  let pnl = 0;
  let cost = 0;
  for (const p of open) {
    if (p.closed) continue;
    pnl += p.unrealisedPnl ?? 0;
    // Unpriced holdings report no P&L; their cost would drag the percentage toward zero.
    if (p.valueUsd > 0) cost += p.costBasis ?? 0;
  }
  return { pnl, pct: cost > 0 ? (pnl / cost) * 100 : null };
}

/** Sum of realised P&L over every position, closed ones included (it survives a full sale). */
export function totalRealisedPnl(all: PortfolioPosition[]): number {
  return all.reduce((sum, p) => sum + (p.realisedPnl ?? 0), 0);
}
