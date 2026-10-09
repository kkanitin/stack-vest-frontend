import { describe, expect, it } from 'vitest';
import { totalRealisedPnl, totalUnrealisedPnl } from './pnlTotals';
import type { PortfolioPosition } from '../api/portfolio';

function pos(over: Partial<PortfolioPosition>): PortfolioPosition {
  return {
    id: 'x', symbol: 'X', name: 'X', shares: 1, avgCost: 1, valueUsd: 1, change24h: 0, addedAt: '',
    costBasis: 0, unrealisedPnl: 0, unrealisedPnlPct: 0, realisedPnl: 0, closed: false, ...over,
  };
}

describe('pnlTotals', () => {
  it('sums unrealised P&L and reports it against total cost', () => {
    const r = totalUnrealisedPnl([
      pos({ costBasis: 100, unrealisedPnl: 20 }),
      pos({ costBasis: 100, unrealisedPnl: -10 }),
    ]);
    expect(r.pnl).toBe(10);
    expect(r.pct).toBeCloseTo(5);
  });

  it('leaves an unpriced holding (valueUsd 0) out of the percentage denominator', () => {
    const r = totalUnrealisedPnl([
      pos({ costBasis: 100, unrealisedPnl: 10, valueUsd: 110 }),
      pos({ costBasis: 900, unrealisedPnl: 0, valueUsd: 0 }),
    ]);
    expect(r.pct).toBeCloseTo(10);
  });

  it('has no percentage without any cost basis', () => {
    expect(totalUnrealisedPnl([]).pct).toBeNull();
  });

  it('sums realised P&L across open and closed positions', () => {
    expect(totalRealisedPnl([pos({ realisedPnl: 5 }), pos({ realisedPnl: -2, closed: true })])).toBe(3);
  });
});
