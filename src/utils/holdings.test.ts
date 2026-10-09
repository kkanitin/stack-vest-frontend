import { mergeHoldings, allocationSlices, biggestMovers, OTHER_KEY } from './holdings';
import type { PortfolioPosition } from '../api/portfolio';

function pos(symbol: string, valueUsd: number, change24h = 0, shares = 1): PortfolioPosition {
  return { id: `${symbol}-${valueUsd}`, symbol, name: `${symbol} Inc`, shares, avgCost: 1, valueUsd, change24h, addedAt: '', costBasis: 0, unrealisedPnl: 0, unrealisedPnlPct: 0, realisedPnl: 0, closed: false };
}

describe('mergeHoldings', () => {
  it('merges a symbol held in two portfolios into one holding', () => {
    const holdings = mergeHoldings([pos('VOO', 600, 1.2, 2), pos('QQQ', 100), pos('VOO', 300, 1.2, 1)]);

    expect(holdings.map(h => h.symbol)).toEqual(['VOO', 'QQQ']);
    expect(holdings[0]).toMatchObject({ symbol: 'VOO', shares: 3, valueUsd: 900, change24h: 1.2 });
  });

  it('gives weights that sum to 100 and sorts by value, largest first', () => {
    const holdings = mergeHoldings([pos('A', 250), pos('B', 500), pos('A', 250)]);

    expect(holdings.map(h => h.symbol)).toEqual(['A', 'B']);
    expect(holdings.reduce((sum, h) => sum + h.weight, 0)).toBeCloseTo(100);
    expect(holdings[0].weight).toBeCloseTo(50);
  });

  it('keeps an unpriced holding with zero value and zero weight', () => {
    const holdings = mergeHoldings([pos('A', 100), pos('B', 0)]);

    expect(holdings.find(h => h.symbol === 'B')).toMatchObject({ valueUsd: 0, weight: 0 });
    expect(holdings.find(h => h.symbol === 'A')?.weight).toBeCloseTo(100);
  });

  it('returns nothing for no positions and zero weights when nothing is priced', () => {
    expect(mergeHoldings([])).toEqual([]);
    expect(mergeHoldings([pos('A', 0)])[0].weight).toBe(0);
  });
});

describe('allocationSlices', () => {
  it('shows every holding when they fit', () => {
    const slices = allocationSlices(mergeHoldings([pos('A', 300), pos('B', 100)]), 5);

    expect(slices.map(s => s.label)).toEqual(['A', 'B']);
    expect(slices.some(s => s.key === OTHER_KEY)).toBe(false);
  });

  it('folds the tail into "Other" and still sums to 100', () => {
    const holdings = mergeHoldings(['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((s, i) => pos(s, 700 - i * 100)));
    const slices = allocationSlices(holdings, 5);

    expect(slices).toHaveLength(6);
    expect(slices[5]).toMatchObject({ key: OTHER_KEY, label: 'Other', valueUsd: 300 });
    expect(slices.reduce((sum, s) => sum + s.weight, 0)).toBeCloseTo(100);
  });

  it('leaves out holdings with no value', () => {
    expect(allocationSlices(mergeHoldings([pos('A', 100), pos('B', 0)]), 5).map(s => s.label)).toEqual(['A']);
  });
});

describe('biggestMovers', () => {
  it('ranks by the size of the move, gains and losses together', () => {
    const holdings = mergeHoldings([pos('UP', 100, 2), pos('DOWN', 100, -5), pos('SMALL', 100, 0.5)]);

    expect(biggestMovers(holdings, 2).map(h => h.symbol)).toEqual(['DOWN', 'UP']);
  });

  it('leaves out flat and unpriced holdings', () => {
    const holdings = mergeHoldings([pos('FLAT', 100, 0.001), pos('UNPRICED', 0, 9), pos('UP', 100, 1)]);

    expect(biggestMovers(holdings, 5).map(h => h.symbol)).toEqual(['UP']);
  });
});
