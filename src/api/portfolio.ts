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

export async function addPosition(token: string, body: AddPositionBody): Promise<PortfolioPosition> {
  const res = await fetch(`${API_BASE}/portfolio/positions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (res.ok && data.code === 201) return data.result as PortfolioPosition;
  throw new Error(data.errorMessage || 'Failed to add position');
}

export async function updatePosition(
  token: string,
  symbol: string,
  body: UpdatePositionBody
): Promise<PortfolioPosition> {
  const res = await fetch(`${API_BASE}/portfolio/positions/${encodeURIComponent(symbol)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (res.ok && data.code === 200) return data.result as PortfolioPosition;
  throw new Error(data.errorMessage || 'Failed to update position');
}

export async function removePosition(token: string, symbol: string): Promise<void> {
  const res = await fetch(`${API_BASE}/portfolio/positions/${encodeURIComponent(symbol)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 204) return;
  const data = await res.json().catch(() => ({}));
  throw new Error(data.errorMessage || 'Failed to remove position');
}
