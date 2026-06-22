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

/** Mirrors the backend `domain.Match` shape returned by `GET /stocks/search`.
 *  `type` is the exchange code and `region` the exchange full name (FMP-derived). */
export interface StockSearchResult {
  symbol: string;
  name: string;
  type: string;
  region: string;
  currency: string;
}

export interface SearchOptions {
  /** Abort the request (used by the debounced hook to drop stale responses). */
  signal?: AbortSignal;
  /** 1-based page (backend default 1). */
  page?: number;
  /** Results per page (backend default 20, max 100). */
  size?: number;
}

/** `GET /stocks/search?keywords=…&page=&size=`. The endpoint is paginated
 *  (`response.OKList`); the typeahead intentionally consumes the default first page. */
export async function searchStocks(
  token: string,
  keywords: string,
  options: SearchOptions = {}
): Promise<StockSearchResult[]> {
  const params = new URLSearchParams({ keywords });
  if (options.page != null) params.set('page', String(options.page));
  if (options.size != null) params.set('size', String(options.size));
  const res = await fetch(`${API_BASE}/stocks/search?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: options.signal,
  });
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

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  timestamp: string;
}

export async function getStockQuote(token: string, symbol: string): Promise<StockQuote> {
  const res = await fetch(
    `${API_BASE}/stocks/${encodeURIComponent(symbol)}/quote`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  if (res.ok && data.code === 200) return data.result as StockQuote;
  throw new Error(data.errorMessage || `Failed to fetch quote for ${symbol}`);
}

export interface HistoryPoint {
  date: string;
  close: number;
}

export interface StockHistory {
  symbol: string;
  range: string;
  points: HistoryPoint[];
}

export async function getStockHistory(
  token: string,
  symbol: string,
  range: '7d' | '1M' | '3M' | '6M' | '1Y' | '5Y'
): Promise<StockHistory> {
  const res = await fetch(
    `${API_BASE}/stocks/${encodeURIComponent(symbol)}/history?range=${range}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  if (res.ok && data.code === 200) return data.result as StockHistory;
  throw new Error(data.errorMessage || `Failed to fetch history for ${symbol}`);
}

export interface BatchHistoryItem {
  symbol: string;
  range: string;
  points: HistoryPoint[];
}

export async function getBatchPriceChanges(
  token: string,
  symbols: string[]
): Promise<StockPriceChange[]> {
  if (!symbols.length) return [];
  return Promise.all(symbols.map(symbol => getStockPriceChange(token, symbol)));
}

export async function getBatchHistory(
  token: string,
  symbols: string[],
  range: '7D' | '30D' | '90D' | '1Y' | 'All'
): Promise<BatchHistoryItem[]> {
  if (!symbols.length) return [];
  const res = await fetch(
    `${API_BASE}/stocks/history?symbols=${symbols.map(encodeURIComponent).join(',')}&range=${range}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  if (res.ok && data.code === 200) return data.result as BatchHistoryItem[];
  throw new Error(data.errorMessage || 'Failed to fetch batch history');
}

/** Mirrors the backend `domain.CompanyProfile` returned by `GET /stocks/:symbol/profile`.
 *  Many fields are optional in practice (e.g. ETFs return empty ceo/sector/employees). */
export interface CompanyProfile {
  symbol: string;
  companyName: string;
  currency: string;
  exchange: string;
  exchangeFullName: string;
  industry: string;
  sector: string;
  country: string;
  ceo: string;
  website: string;
  description: string;
  image: string;
  price: number;
  marketCap: number;
  beta: number;
  ipoDate: string;
  fullTimeEmployees: string;
  isEtf: boolean;
  isActivelyTrading: boolean;
}

export async function getCompanyProfile(
  token: string,
  symbol: string
): Promise<CompanyProfile> {
  const res = await fetch(
    `${API_BASE}/stocks/${encodeURIComponent(symbol)}/profile`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  if (res.ok && data.code === 200) return data.result as CompanyProfile;
  throw new Error(data.errorMessage || `Failed to fetch profile for ${symbol}`);
}
