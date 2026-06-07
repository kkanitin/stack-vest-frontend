import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getPortfolioSummary } from '../api/portfolio';
import type { PortfolioSummary } from '../api/portfolio';

export function usePortfolioSummary() {
  const { token } = useAuth();
  return useQuery<PortfolioSummary>({
    queryKey: ['portfolio', 'summary'],
    queryFn: () => getPortfolioSummary(token!),
    enabled: !!token,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
