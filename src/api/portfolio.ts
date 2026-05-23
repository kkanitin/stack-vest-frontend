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

export interface PortfolioActivity {
  id: string;
  symbol?: string;
  label: string;
  detail: string;
  tone: 'positive' | 'negative' | 'neutral';
  badge: string;
  timestamp: string;
}

export async function getPortfolioSummary(token: string): Promise<PortfolioSummary> {
  const res = await fetch(`${API_BASE}/portfolio/summary`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (res.ok && data.code === 200) return data.result as PortfolioSummary;
  throw new Error(data.errorMessage || 'Failed to load portfolio summary');
}

export async function getPortfolioPositions(token: string): Promise<PortfolioPosition[]> {
  const res = await fetch(`${API_BASE}/portfolio/positions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (res.ok && data.code === 200) return data.result as PortfolioPosition[];
  throw new Error(data.errorMessage || 'Failed to load portfolio positions');
}

export async function getPortfolioActivity(token: string, limit = 10): Promise<PortfolioActivity[]> {
  const res = await fetch(`${API_BASE}/portfolio/activity?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (res.ok && data.code === 200) return data.result as PortfolioActivity[];
  throw new Error(data.errorMessage || 'Failed to load portfolio activity');
}
