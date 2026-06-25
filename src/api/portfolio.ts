const API_BASE = `${import.meta.env.VITE_API_URL}/api/v1`;

export interface PortfolioSummary {
  totalValue: number;
  change30d: number;
  changePct30d: number;
}

export interface PortfolioPosition {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
  valueUsd: number;
  change24h: number;
  addedAt: string;
}

export interface AddPositionBody {
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
}

export interface UpdatePositionBody {
  shares?: number;
  avgCost?: number;
}

export async function getPortfolioSummary(token: string): Promise<PortfolioSummary> {
  const res = await fetch(`${API_BASE}/portfolios/summary`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (res.ok && data.code === 200) return data.result as PortfolioSummary;
  throw new Error(data.errorMessage || 'Failed to load portfolio summary');
}
