import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getRecentActivity } from '../api/portfolios';
import type { PortfolioActivity } from '../api/portfolios';

/** The newest activity across all portfolios, newest first, in one request. */
export function useRecentActivity(limit: number) {
  const { token } = useAuth();
  return useQuery<PortfolioActivity[]>({
    // Under ['portfolios'] so the invalidations fired by position and portfolio edits reach it.
    queryKey: ['portfolios', 'activity', limit],
    queryFn: () => getRecentActivity(token!, limit),
    enabled: !!token,
    staleTime: 60_000,
  });
}
