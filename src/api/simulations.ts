const API_BASE = `${import.meta.env.VITE_API_URL}/api/v1`;

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
  throw new Error(data.errorMessage || 'Simulation failed');
}
