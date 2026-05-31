const API_BASE = `${import.meta.env.VITE_API_URL}/api/v1`;

export interface PopularAsset {
  symbol: string;
  name: string;
  type: string;
  category: string[];
}

export interface GetPopularAssetsParams {
  type?: 'stock' | 'etf' | 'all';
  limit?: number;
}

export async function getPopularAssets(params?: GetPopularAssetsParams): Promise<PopularAsset[]> {
  const qs = new URLSearchParams();
  if (params?.type) qs.set('type', params.type);
  if (params?.limit != null) qs.set('limit', String(params.limit));
  const query = qs.toString() ? `?${qs.toString()}` : '';
  const res = await fetch(`${API_BASE}/popular${query}`);
  const data = await res.json();
  if (res.ok && data.code === 200) return data.results as PopularAsset[];
  throw new Error(data.errorMessage || 'Failed to load popular assets');
}
