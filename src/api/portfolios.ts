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

// ---------------------------------------------------------------------------
// AI analysis (streaming, Server-Sent Events)
// ---------------------------------------------------------------------------

/** Default analysis dimensions sent to POST /portfolios/{id}/analyze. */
export const DEFAULT_ANALYSIS_DIMENSIONS = ['diversification', 'risk', 'fees'];

/**
 * Streams an AI-generated review of a stored portfolio.
 *
 * Unlike the other endpoints this one does NOT return the JSON envelope on success —
 * it responds with `text/event-stream` and pushes the analysis text incrementally,
 * ending with a single `data: [DONE]` frame. Pre-stream failures (400/404/429/502/500)
 * still use the standard envelope, which we surface as a thrown Error.
 *
 * `EventSource` can't send an Authorization header or a POST body, so we read the
 * response body stream directly via fetch.
 */
export async function analyzePortfolio(
  token: string,
  portfolioId: string,
  dimensions: string[],
  opts: { signal?: AbortSignal; onChunk: (text: string) => void }
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/portfolios/${encodeURIComponent(portfolioId)}/analyze`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({ dimensions }),
      signal: opts.signal,
    }
  );

  // Pre-stream errors arrive as the standard JSON envelope.
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.errorMessage || 'Failed to analyze portfolio');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // SSE frames are separated by a blank line; keep the trailing partial frame buffered.
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';
    for (const frame of frames) {
      const dataLines = frame
        .split('\n')
        .filter(line => line.startsWith('data:'))
        .map(line => line.slice(5).replace(/^ /, ''));
      if (dataLines.length === 0) continue;
      const payload = dataLines.join('\n');
      if (payload === '[DONE]') return;
      // Each frame is an OpenAI/Groq chat-completion chunk; the text we want is the
      // streamed content delta. Skip keepalives / chunks without a content delta.
      let content = '';
      try {
        const parsed = JSON.parse(payload);
        content = parsed?.choices?.[0]?.delta?.content ?? '';
      } catch {
        continue;
      }
      if (content) opts.onChunk(content);
    }
  }
}

// ---------------------------------------------------------------------------
// Analysis payload (the streamed content concatenates into this JSON document)
// ---------------------------------------------------------------------------

export const ANALYSIS_SENTIMENTS = ['positive', 'neutral', 'caution'] as const;
export type AnalysisSentiment = (typeof ANALYSIS_SENTIMENTS)[number];

export interface AnalysisDimension {
  name: string;
  score: number;
  rating: string;
  sentiment: AnalysisSentiment;
  note: string;
}

export interface PortfolioAnalysis {
  summary: string;
  dimensions: AnalysisDimension[];
}

function toDimension(raw: unknown): AnalysisDimension | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.name !== 'string' || typeof r.score !== 'number' || !Number.isFinite(r.score)) {
    return null;
  }
  const sentiment = ANALYSIS_SENTIMENTS.includes(r.sentiment as AnalysisSentiment)
    ? (r.sentiment as AnalysisSentiment)
    : 'neutral';
  return {
    name: r.name,
    score: r.score,
    rating: typeof r.rating === 'string' ? r.rating : '',
    sentiment,
    note: typeof r.note === 'string' ? r.note : '',
  };
}

/**
 * Parses the accumulated analyze stream — the model emits a single JSON document
 * (`{ summary, dimensions }`) token-by-token. Returns `null` while the JSON is still
 * incomplete/invalid (e.g. mid-stream) so callers can keep showing a loading state.
 */
export function parsePortfolioAnalysis(raw: string): PortfolioAnalysis | null {
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!obj || typeof obj !== 'object') return null;
  const o = obj as Record<string, unknown>;
  const summary = typeof o.summary === 'string' ? o.summary : '';
  const dimensions = Array.isArray(o.dimensions)
    ? o.dimensions.map(toDimension).filter((d): d is AnalysisDimension => d !== null)
    : [];
  if (!summary && dimensions.length === 0) return null;
  return { summary, dimensions };
}
