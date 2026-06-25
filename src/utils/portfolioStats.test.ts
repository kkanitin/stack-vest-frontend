import { totalNetValue, change24h } from './portfolioStats';
import type { PortfolioPosition } from '../api/portfolio';

function pos(overrides: Partial<PortfolioPosition>): PortfolioPosition {
  return {
    id: 'x',
    symbol: 'X',
    name: 'X',
    shares: 1,
    avgCost: 1,
    valueUsd: 0,
    change24h: 0,
    addedAt: '',
    ...overrides,
  };
}

describe('totalNetValue', () => {
  it('sums valueUsd across positions', () => {
    expect(totalNetValue([pos({ valueUsd: 100 }), pos({ valueUsd: 50.5 })])).toBe(150.5);
  });

  it('returns 0 for an empty list', () => {
    expect(totalNetValue([])).toBe(0);
  });
});

describe('change24h', () => {
  it('aggregates the 24h delta and percent from current value + change%', () => {
    // 110 now at +10% → prev 100 (delta +10); 90 now at -10% → prev 100 (delta -10).
    const { deltaUsd, pct, hasData } = change24h([
      pos({ valueUsd: 110, change24h: 10 }),
      pos({ valueUsd: 90, change24h: -10 }),
    ]);
    expect(hasData).toBe(true);
    expect(deltaUsd).toBeCloseTo(0, 6); // +10 and -10 cancel
    expect(pct).toBeCloseTo(0, 6);      // prevTotal 200, delta 0
  });

  it('computes a positive aggregate correctly', () => {
    // 110 now at +10% → prev 100, delta +10. Single holding.
    const { deltaUsd, pct } = change24h([pos({ valueUsd: 110, change24h: 10 })]);
    expect(deltaUsd).toBeCloseTo(10, 6);
    expect(pct).toBeCloseTo(10, 6);
  });

  it('reports hasData=false when no position has a usable value', () => {
    const { hasData, deltaUsd, pct } = change24h([pos({ valueUsd: 0, change24h: 5 })]);
    expect(hasData).toBe(false);
    expect(deltaUsd).toBe(0);
    expect(pct).toBe(0);
  });
});
