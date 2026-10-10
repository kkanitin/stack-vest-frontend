import { hierarchy, treemap, treemapSquarify } from 'd3-hierarchy';
import type { HeatmapSector, HeatmapStock } from '../api/market';

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface SectorRect extends Rect {
  name: string;
}

export interface TileRect extends Rect {
  stock: HeatmapStock;
  sector: string;
}

export interface TreemapLayout {
  sectors: SectorRect[];
  tiles: TileRect[];
}

export interface LayoutOptions {
  /** Height reserved at the top of each sector for its label. */
  headerHeight?: number;
  /** Gap between sectors. */
  sectorGap?: number;
  /** Gap between tiles inside a sector. */
  tileGap?: number;
}

type Node =
  | { kind: 'root'; children: Node[] }
  | { kind: 'sector'; name: string; children: Node[] }
  | { kind: 'stock'; stock: HeatmapStock; sector: string };

/**
 * Squarified two-level treemap: sectors, then the stocks inside each sector,
 * every area proportional to market cap. Sectors keep the order the API sends
 * (largest first), which squarify places top-left.
 */
export function layoutTreemap(
  sectors: HeatmapSector[],
  width: number,
  height: number,
  { headerHeight = 18, sectorGap = 4, tileGap = 1 }: LayoutOptions = {}
): TreemapLayout {
  if (width <= 0 || height <= 0) return { sectors: [], tiles: [] };

  const data: Node = {
    kind: 'root',
    children: sectors
      .map((s): Node => ({
        kind: 'sector',
        name: s.name,
        children: s.stocks
          .filter(st => st.marketCap > 0)
          .map((stock): Node => ({ kind: 'stock', stock, sector: s.name })),
      }))
      .filter(s => s.kind === 'sector' && s.children.length > 0),
  };

  const root = hierarchy<Node>(data, n => (n.kind === 'stock' ? undefined : n.children))
    .sum(n => (n.kind === 'stock' ? n.stock.marketCap : 0))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  const laid = treemap<Node>()
    .tile(treemapSquarify)
    .size([width, height])
    .paddingInner(n => (n.depth === 0 ? sectorGap : tileGap))
    .paddingTop(n => (n.depth === 1 ? headerHeight : 0))
    .round(true)(root);

  const out: TreemapLayout = { sectors: [], tiles: [] };
  for (const n of laid.descendants()) {
    const { x0, y0, x1, y1 } = n;
    if (n.data.kind === 'sector') out.sectors.push({ x0, y0, x1, y1, name: n.data.name });
    else if (n.data.kind === 'stock') out.tiles.push({ x0, y0, x1, y1, stock: n.data.stock, sector: n.data.sector });
  }
  return out;
}
