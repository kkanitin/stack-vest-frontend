import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getSuggestedReturn } from '../api/portfolios';
import type { SuggestedReturn } from '../api/portfolios';

/** The suggested expected return for a portfolio; idle while `portfolioId` is undefined. */
export function useSuggestedReturn(portfolioId: string | undefined) {
  const { token } = useAuth();
  return useQuery<SuggestedReturn>({
    queryKey: ['portfolio', portfolioId, 'suggested-return'],
    queryFn: () => getSuggestedReturn(token!, portfolioId!),
    enabled: !!token && !!portfolioId,
    // Ten years of daily closes move slowly; the backend caches them for hours.
    staleTime: 10 * 60_000,
    retry: 1,
  });
}
