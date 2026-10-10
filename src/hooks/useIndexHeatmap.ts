import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getIndexHeatmap, HeatmapWarmingError } from '../api/market';
import type { IndexKey } from '../api/market';

/** Index heatmap snapshot. The backend rebuilds it every few minutes, so it is polled. */
export function useIndexHeatmap(index: IndexKey | null) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['indexHeatmap', index],
    queryFn: () => getIndexHeatmap(token!, index!),
    enabled: !!token && index !== null,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    // Keep polling while the backend warms up (about a minute or two on a cold start).
    retry: (count, err) => (err instanceof HeatmapWarmingError ? count < 20 : count < 2),
    retryDelay: (count, err) =>
      err instanceof HeatmapWarmingError ? 15_000 : Math.min(1000 * 2 ** count, 10_000),
  });
}
