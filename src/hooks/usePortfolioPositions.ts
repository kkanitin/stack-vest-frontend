import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getPortfolioPositions } from '../api/portfolio';
import type { PortfolioPosition } from '../api/portfolio';

export function usePortfolioPositions() {
  const { token } = useAuth();
  return useQuery<PortfolioPosition[]>({
    queryKey: ['portfolio', 'positions'],
    queryFn: () => getPortfolioPositions(token!),
    enabled: !!token,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
