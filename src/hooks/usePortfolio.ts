import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getPortfolio } from '../api/portfolios';
import type { Portfolio } from '../api/portfolios';

export function usePortfolio(id: string | undefined) {
  const { token } = useAuth();
  return useQuery<Portfolio>({
    queryKey: ['portfolio', id],
    queryFn: () => getPortfolio(token!, id!),
    enabled: !!token && !!id,
    staleTime: 60_000,
  });
}
