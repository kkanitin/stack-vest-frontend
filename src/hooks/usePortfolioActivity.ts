import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getPortfolioActivity } from '../api/portfolio';
import type { PortfolioActivity } from '../api/portfolio';

export function usePortfolioActivity(limit = 10) {
  const { token } = useAuth();
  return useQuery<PortfolioActivity[]>({
    queryKey: ['portfolio', 'activity', limit],
    queryFn: () => getPortfolioActivity(token!, limit),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}
