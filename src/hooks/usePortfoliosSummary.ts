import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getPortfoliosSummary } from '../api/portfolios';
import type { PortfoliosSummary } from '../api/portfolios';

export function usePortfoliosSummary() {
  const { token } = useAuth();
  return useQuery<PortfoliosSummary>({
    queryKey: ['portfolios', 'summary'],
    queryFn: () => getPortfoliosSummary(token!),
    enabled: !!token,
    staleTime: 60_000,
  });
}
