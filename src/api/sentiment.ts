const API_BASE = `${import.meta.env.VITE_API_URL}/api/v1`;

export type FearGreedStatus = 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed';

export interface FearGreedSignals {
  vix: number;
  indexChangePercent: number;
  gainersCount: number;
  losersCount: number;
}

export interface FearGreedIndex {
  score: number;
  status: FearGreedStatus;
  signals: FearGreedSignals;
  timestamp: string;
}

export async function getFearGreedIndex(token: string): Promise<FearGreedIndex> {
  const res = await fetch(`${API_BASE}/sentiment`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (res.ok && data.code === 200) return data.result as FearGreedIndex;
  throw new Error(data.errorMessage || 'Failed to load market sentiment');
}
