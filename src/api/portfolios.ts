import type {
  PortfolioPosition,
  AddPositionBody,
  UpdatePositionBody,
} from './portfolio';

const API_BASE = `${import.meta.env.VITE_API_URL}/api/v1`;

/**
 * A named portfolio belonging to the authenticated user.
 *
 * `id`, `name`, `description`, `createdAt`, `updatedAt` come from the documented
 * backend contract. `value` and `assetCount` are enrichment fields the cards display;
 * they are ASSUMED pending backend support (see docs/portfolios-backend-gaps.md) and are
 * therefore optional so the UI degrades gracefully when they are absent.
 */
export interface Portfolio {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  value?: number;
  assetCount?: number;
}

/** Aggregate stats for the Portfolios header. ASSUMED endpoint. */
export interface PortfoliosSummary {
  totalValue: number;
  changePct: number;
  diversificationScore: number; // 0-100
}

export interface CreatePortfolioBody {
  name: string;
  description?: string;
}

export interface UpdatePortfolioBody {
  name?: string;
  description?: string;
}

/** Thrown when the per-user portfolio limit is reached (HTTP 409). */
export class PortfolioLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PortfolioLimitError';
  }
}

// ---------------------------------------------------------------------------
// Portfolio CRUD
// ---------------------------------------------------------------------------

export async function listPortfolios(token: string): Promise<Portfolio[]> {
  const res = await fetch(`${API_BASE}/portfolios`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (res.ok && data.code === 200) return data.result as Portfolio[];
  throw new Error(data.errorMessage || 'Failed to load portfolios');
}

export async function getPortfolio(token: string, id: string): Promise<Portfolio> {
  const res = await fetch(`${API_BASE}/portfolios/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (res.ok && data.code === 200) return data.result as Portfolio;
  throw new Error(data.errorMessage || 'Failed to load portfolio');
}

export async function createPortfolio(
  token: string,
  body: CreatePortfolioBody
): Promise<Portfolio> {
  const res = await fetch(`${API_BASE}/portfolios`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (res.ok && data.code === 201) return data.result as Portfolio;
  if (res.status === 409) {
    throw new PortfolioLimitError(data.errorMessage || 'Portfolio limit reached');
  }
  throw new Error(data.errorMessage || 'Failed to create portfolio');
}

/** ASSUMED endpoint: PATCH /portfolios/{id}. */
export async function updatePortfolio(
  token: string,
  id: string,
  body: UpdatePortfolioBody
): Promise<Portfolio> {
  const res = await fetch(`${API_BASE}/portfolios/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (res.ok && data.code === 200) return data.result as Portfolio;
  throw new Error(data.errorMessage || 'Failed to update portfolio');
}

/** ASSUMED endpoint: DELETE /portfolios/{id}. */
export async function deletePortfolio(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/portfolios/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 204 || res.ok) return;
  const data = await res.json().catch(() => ({}));
  throw new Error(data.errorMessage || 'Failed to delete portfolio');
}

/** ASSUMED endpoint: GET /portfolios/summary. */
export async function getPortfoliosSummary(token: string): Promise<PortfoliosSummary> {
  const res = await fetch(`${API_BASE}/portfolios/summary`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (res.ok && data.code === 200) return data.result as PortfoliosSummary;
  throw new Error(data.errorMessage || 'Failed to load portfolios summary');
}

// ---------------------------------------------------------------------------
// Per-portfolio holdings (ASSUMED endpoints — mirror the global /portfolio/positions shape)
// ---------------------------------------------------------------------------

export async function getPortfolioPositions(
  token: string,
  portfolioId: string
): Promise<PortfolioPosition[]> {
  const res = await fetch(
    `${API_BASE}/portfolios/${encodeURIComponent(portfolioId)}/positions`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  if (res.ok && data.code === 200) return data.result as PortfolioPosition[];
  throw new Error(data.errorMessage || 'Failed to load portfolio positions');
}

export async function addPortfolioPosition(
  token: string,
  portfolioId: string,
  body: AddPositionBody
): Promise<PortfolioPosition> {
  const res = await fetch(
    `${API_BASE}/portfolios/${encodeURIComponent(portfolioId)}/positions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );
  const data = await res.json();
  if (res.ok && data.code === 201) return data.result as PortfolioPosition;
  throw new Error(data.errorMessage || 'Failed to add position');
}

export async function updatePortfolioPosition(
  token: string,
  portfolioId: string,
  symbol: string,
  body: UpdatePositionBody
): Promise<PortfolioPosition> {
  const res = await fetch(
    `${API_BASE}/portfolios/${encodeURIComponent(portfolioId)}/positions/${encodeURIComponent(symbol)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );
  const data = await res.json();
  if (res.ok && data.code === 200) return data.result as PortfolioPosition;
  throw new Error(data.errorMessage || 'Failed to update position');
}

export async function removePortfolioPosition(
  token: string,
  portfolioId: string,
  symbol: string
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/portfolios/${encodeURIComponent(portfolioId)}/positions/${encodeURIComponent(symbol)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (res.status === 204 || res.ok) return;
  const data = await res.json().catch(() => ({}));
  throw new Error(data.errorMessage || 'Failed to remove position');
}
