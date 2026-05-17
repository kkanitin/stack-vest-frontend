const API_BASE = `${import.meta.env.VITE_API_URL}/api/v1`;

export interface StockPriceChange {
  symbol: string;
  '1D': number;
  '5D': number;
  '1M': number;
  '3M': number;
  '6M': number;
  ytd: number;
  '1Y': number;
  '3Y': number;
  '5Y': number;
  '10Y': number;
  max: number;
}

export interface StockSearchResult {
  symbol: string;
  name: string;
  type: string;
  region: string;
  currency: string;
  matchScore: string;
}

export async function searchStocks(
  token: string,
  keywords: string
): Promise<StockSearchResult[]> {
  const res = await fetch(
    `${API_BASE}/stocks/search?keywords=${encodeURIComponent(keywords)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  if (res.ok && data.code === 200) return data.results as StockSearchResult[];
  throw new Error(data.errorMessage || 'Search failed');
}

export async function getStockPriceChange(
  token: string,
  symbol: string
): Promise<StockPriceChange> {
  const res = await fetch(
    `${API_BASE}/stocks/${encodeURIComponent(symbol)}/price-change`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  if (res.ok && data.code === 200) return data.result as StockPriceChange;
  throw new Error(data.errorMessage || `Failed to fetch price change for ${symbol}`);
}
