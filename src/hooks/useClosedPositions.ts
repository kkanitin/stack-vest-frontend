import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getPortfolioPositions } from '../api/portfolios';
import type { PortfolioPosition } from '../api/portfolio';

/** Fully sold holdings of a portfolio (with their realised P&L); open ones are filtered out. */
export function useClosedPositions(portfolioId: string | undefined) {
  const { token } = useAuth();
  return useQuery<PortfolioPosition[]>({
    // Under [..., 'positions'] so position/ledger invalidations reach it.
    queryKey: ['portfolio', portfolioId, 'positions', 'closed'],
    queryFn: async () =>
      (await getPortfolioPositions(token!, portfolioId!, { includeClosed: true })).filter(p => p.closed),
    enabled: !!token && !!portfolioId,
    staleTime: 60_000,
  });
}
