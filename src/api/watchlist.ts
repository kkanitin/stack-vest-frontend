const API_BASE = `${import.meta.env.VITE_API_URL}/api/v1`;

export interface WatchlistItem {
  id: string;
  userId: string;
  symbol: string;
  name: string;
  type: string;
  addedAt: string;
  alertsEnabled: boolean;
  category: string[];
}

export async function getWatchlist(token: string): Promise<WatchlistItem[]> {
  const res = await fetch(`${API_BASE}/watchlist`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (res.ok && data.code === 200) return data.results as WatchlistItem[];
  throw new Error(data.errorMessage || 'Failed to load watchlist');
}

export async function addToWatchlist(
  token: string,
  body: { symbol: string; name: string; type: string }
): Promise<void> {
  const res = await fetch(`${API_BASE}/watchlist`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.errorMessage || 'Failed to add to watchlist');
  }
}

export async function deleteFromWatchlist(token: string, symbol: string): Promise<void> {
  const res = await fetch(`${API_BASE}/watchlist/${symbol}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.errorMessage || 'Failed to remove from watchlist');
  }
}

export async function setWatchlistAlerts(
  token: string,
  symbol: string,
  enabled: boolean
): Promise<void> {
  const res = await fetch(`${API_BASE}/watchlist/${encodeURIComponent(symbol)}/alerts`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ enabled }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.errorMessage || 'Failed to update alerts');
  }
}
