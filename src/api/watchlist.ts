const API_BASE = `${import.meta.env.VITE_API_URL}/api/v1`;

export interface WatchlistItem {
  id: string;
  userId: string;
  symbol: string;
  name: string;
  type: string;
  addedAt: string;
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
