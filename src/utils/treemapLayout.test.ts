import { describe, it, expect } from 'vitest';
import { layoutTreemap } from './treemapLayout';
import type { HeatmapSector, HeatmapStock } from '../api/market';

const stock = (symbol: string, marketCap: number): HeatmapStock => ({
  symbol, name: symbol, subSector: '', marketCap, price: 1,
  change: { '1D': 0, '1W': null, '1M': null, YTD: null },
});

const sectors: HeatmapSector[] = [
  { name: 'Technology', marketCap: 600, stocks: [stock('MSFT', 400), stock('AAPL', 200)] },
  { name: 'Finance', marketCap: 300, stocks: [stock('JPM', 300), stock('ZERO', 0)] },
  { name: 'Empty', marketCap: 0, stocks: [] },
];

const area = (r: { x0: number; y0: number; x1: number; y1: number }) => (r.x1 - r.x0) * (r.y1 - r.y0);

describe('layoutTreemap', () => {
  const layout = layoutTreemap(sectors, 900, 600, { headerHeight: 0, sectorGap: 0, tileGap: 0 });

  it('lays out one tile per stock with a market cap and skips empty sectors', () => {
    expect(layout.tiles.map(t => t.stock.symbol).sort()).toEqual(['AAPL', 'JPM', 'MSFT']);
    expect(layout.sectors.map(s => s.name)).toEqual(['Technology', 'Finance']);
  });

  it('keeps every tile inside the bounds', () => {
    for (const t of layout.tiles) {
      expect(t.x0).toBeGreaterThanOrEqual(0);
      expect(t.y0).toBeGreaterThanOrEqual(0);
      expect(t.x1).toBeLessThanOrEqual(900);
      expect(t.y1).toBeLessThanOrEqual(600);
    }
  });

  it('sizes tiles in proportion to market cap', () => {
    const byId = Object.fromEntries(layout.tiles.map(t => [t.stock.symbol, area(t)]));
    const total = 900 * 600;
    expect(byId.MSFT / total).toBeCloseTo(400 / 900, 1);
    expect(byId.JPM / total).toBeCloseTo(300 / 900, 1);
    expect(byId.MSFT / byId.AAPL).toBeCloseTo(2, 0);
  });

  it('reserves the sector header above the tiles', () => {
    const withHeader = layoutTreemap(sectors, 900, 600, { headerHeight: 18 });
    const tech = withHeader.sectors.find(s => s.name === 'Technology')!;
    for (const t of withHeader.tiles.filter(t => t.sector === 'Technology')) {
      expect(t.y0).toBeGreaterThanOrEqual(tech.y0 + 18);
    }
  });

  it('returns nothing for an unmeasured container', () => {
    expect(layoutTreemap(sectors, 0, 0)).toEqual({ sectors: [], tiles: [] });
  });
});
