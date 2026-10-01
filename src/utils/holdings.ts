import type { PortfolioPosition } from '../api/portfolio';
import { changeTone } from './format';

/** One symbol's combined exposure across every portfolio that holds it. */
export interface Holding {
  symbol: string;
  name: string;
  shares: number;
  valueUsd: number;
  change24h: number;
  /** Share of the total priced value, 0–100. */
  weight: number;
}

export interface AllocationSlice {
  key: string;
  label: string;
  valueUsd: number;
  weight: number;
}

export const OTHER_KEY = '__other__';

/** Named allocation slices — one per categorical series colour (`--series-1` … `--series-5`). */
export const MAX_NAMED_SLICES = 5;

/**
 * Merges positions across portfolios into one holding per symbol, largest first.
 * An unpriced position (no usable `valueUsd`) is kept with zero value and weight so
 * it still counts as a holding without distorting the weights of the priced ones.
 */
export function mergeHoldings(positions: PortfolioPosition[]): Holding[] {
  const bySymbol = new Map<string, Holding>();
  for (const p of positions) {
    const value = Number.isFinite(p.valueUsd) && p.valueUsd > 0 ? p.valueUsd : 0;
    const change = Number.isFinite(p.change24h) ? p.change24h : 0;
    const existing = bySymbol.get(p.symbol);
    if (existing) {
      existing.shares += p.shares;
      existing.valueUsd += value;
      // The 24h change is per symbol, so any priced position carries the same figure.
      if (existing.change24h === 0) existing.change24h = change;
    } else {
      bySymbol.set(p.symbol, {
        symbol: p.symbol,
        name: p.name,
        shares: p.shares,
        valueUsd: value,
        change24h: change,
        weight: 0,
      });
    }
  }

  const holdings = [...bySymbol.values()];
  const total = holdings.reduce((sum, h) => sum + h.valueUsd, 0);
  for (const h of holdings) {
    h.weight = total > 0 ? (h.valueUsd / total) * 100 : 0;
  }
  return holdings.sort((a, b) => b.valueUsd - a.valueUsd || a.symbol.localeCompare(b.symbol));
}

/**
 * Allocation slices for priced holdings: the `maxNamed` largest by name, the rest
 * folded into a single "Other" slice so the chart never needs more colours than it has.
 */
export function allocationSlices(holdings: Holding[], maxNamed: number): AllocationSlice[] {
  const valued = holdings.filter(h => h.valueUsd > 0);
  const slices: AllocationSlice[] = valued.slice(0, maxNamed).map(h => ({
    key: h.symbol,
    label: h.symbol,
    valueUsd: h.valueUsd,
    weight: h.weight,
  }));
  const rest = valued.slice(maxNamed);
  if (rest.length > 0) {
    slices.push({
      key: OTHER_KEY,
      label: 'Other',
      valueUsd: rest.reduce((sum, h) => sum + h.valueUsd, 0),
      weight: rest.reduce((sum, h) => sum + h.weight, 0),
    });
  }
  return slices;
}

/** Priced holdings with a visible 24h move, largest move first (gains and losses together). */
export function biggestMovers(holdings: Holding[], limit: number): Holding[] {
  return holdings
    .filter(h => h.valueUsd > 0 && changeTone(h.change24h) !== 'neutral')
    .sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h))
    .slice(0, limit);
}
