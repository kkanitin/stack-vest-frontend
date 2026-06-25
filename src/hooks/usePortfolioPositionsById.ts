import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getPortfolioPositions } from '../api/portfolios';
import type { PortfolioPosition } from '../api/portfolio';

export function usePortfolioPositionsById(portfolioId: string | undefined) {
  const { token } = useAuth();
  return useQuery<PortfolioPosition[]>({
    queryKey: ['portfolio', portfolioId, 'positions'],
    queryFn: () => getPortfolioPositions(token!, portfolioId!),
    enabled: !!token && !!portfolioId,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
