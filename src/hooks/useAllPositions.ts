import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getAllPositions } from '../api/portfolios';
import type { PortfolioPosition } from '../api/portfolio';

/**
 * Every position the user holds, across all portfolios, in one request. A symbol held
 * in several portfolios comes back once per portfolio; `mergeHoldings` combines them.
 */
export function useAllPositions() {
  const { token } = useAuth();
  return useQuery<PortfolioPosition[]>({
    // Under ['portfolios'] so the invalidations fired by position and portfolio edits reach it.
    queryKey: ['portfolios', 'positions'],
    queryFn: () => getAllPositions(token!),
    enabled: !!token,
    staleTime: 60_000,
  });
}
