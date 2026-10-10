import { API_BASE } from './config';

export type IndexKey = 'sp500' | 'nasdaq100' | 'dow30';

/** Percentage change per period; `null` when the backend has no value for that period. */
export interface HeatmapChange {
  '1D': number | null;
  '1W': number | null;
  '1M': number | null;
  YTD: number | null;
}

export interface HeatmapStock {
  symbol: string;
  name: string;
  subSector: string;
  marketCap: number;
  price: number;
  change: HeatmapChange;
}

export interface HeatmapSector {
  name: string;
  marketCap: number;
  stocks: HeatmapStock[];
}

/** Mirrors the backend `market.Heatmap` returned by `GET /market/heatmap`. */
export interface IndexHeatmap {
  index: IndexKey;
  updatedAt: string;
  sectors: HeatmapSector[];
}

/** The backend answers 503 until it has built the first snapshot of an index. */
export class HeatmapWarmingError extends Error {
  constructor() {
    super('Building market map…');
    this.name = 'HeatmapWarmingError';
  }
}

export async function getIndexHeatmap(token: string, index: IndexKey): Promise<IndexHeatmap> {
  const res = await fetch(`${API_BASE}/market/heatmap?index=${index}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 503) throw new HeatmapWarmingError();
  const data = await res.json();
  if (res.ok && data.code === 200) return data.result as IndexHeatmap;
  throw new Error(data.errorMessage || 'Failed to fetch heatmap');
}
