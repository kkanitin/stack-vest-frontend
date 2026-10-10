import { API_BASE } from './config';

export type DcaFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface DcaDataPoint {
  date: string;
  price: number;
  unitsPurchased: number;
  totalUnits: number;
  totalInvested: number;
  portfolioValue: number;
  returnPct: number;
}

export interface DcaResult {
  symbol: string;
  startDate: string;
  endDate: string;
  frequency: DcaFrequency;
  amountPerPeriod: number;
  totalInvested: number;
  finalPortfolioValue: number;
  totalReturn: number;
  totalReturnPct: number;
  annualizedReturnPct: number;
  annualizedReturnNote: string;
  /** Annualised IRR of the dated purchases; null when no rate can be solved. */
  moneyWeightedReturnPct: number | null;
  moneyWeightedReturnNote: string;
  /** States that results are price movement only (no dividends reinvested). */
  priceBasisNote: string;
  periodsCount: number;
  totalUnits: number;
  dataPoints: DcaDataPoint[];
}

export interface DcaParams {
  symbol: string;
  startDate: string;
  endDate: string;
  amount: number;
  frequency: DcaFrequency;
}

/** Failure from `POST /dca/simulate`. `status` is the HTTP status; 404 means no price history for the symbol and range. */
export class DcaRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'DcaRequestError';
  }
}

export async function runDcaSimulation(token: string, params: DcaParams): Promise<DcaResult> {
  const res = await fetch(`${API_BASE}/dca/simulate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (res.ok && data.code === 200) return data.result as DcaResult;
  throw new DcaRequestError(data.errorMessage || 'Simulation failed', res.status);
}

export interface DcaCompareParams {
  symbols: string[];
  startDate: string;
  endDate: string;
  amount: number;
  frequency: DcaFrequency;
}

/** An asset left out of a comparison, with a reason a user can read. */
export interface DcaSkipped {
  symbol: string;
  reason: string;
}

export interface DcaComparison {
  /** In request order; assets that could not be simulated are in `skipped`. */
  results: DcaResult[];
  skipped: DcaSkipped[];
}

/** `POST /dca/compare`: one plan over up to three assets in a single request. */
export async function compareDca(token: string, params: DcaCompareParams): Promise<DcaComparison> {
  const res = await fetch(`${API_BASE}/dca/compare`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (res.ok && data.code === 200) return data.result as DcaComparison;
  throw new DcaRequestError(data.errorMessage || 'Comparison failed', res.status);
}

/** One holding for a holdings simulation; only the proportions between weights matter. */
export interface DcaHolding {
  symbol: string;
  weight: number;
}

export interface DcaHoldingsParams {
  holdings: DcaHolding[];
  startDate: string;
  endDate: string;
  amount: number;
  frequency: DcaFrequency;
}

export interface DcaPortfolioAsset {
  symbol: string;
  /** Share of the money actually invested, 0-100, after skipped assets are dropped. */
  weightPct: number;
  result: DcaResult;
}

/** The plan run across a portfolio's holdings at fixed weights. `combined` is null when no holding had history. */
export interface DcaHoldingsSimulation {
  combined: DcaResult | null;
  assets: DcaPortfolioAsset[];
  skipped: DcaSkipped[];
}

/** `POST /dca/holdings`: one plan split across a portfolio's holdings by weight, in a single request. */
export async function simulateDcaHoldings(token: string, params: DcaHoldingsParams): Promise<DcaHoldingsSimulation> {
  const res = await fetch(`${API_BASE}/dca/holdings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (res.ok && data.code === 200) return data.result as DcaHoldingsSimulation;
  throw new DcaRequestError(data.errorMessage || 'Simulation failed', res.status);
}
