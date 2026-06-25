import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { listPortfolios } from '../api/portfolios';
import type { Portfolio } from '../api/portfolios';

export function usePortfolios() {
  const { token } = useAuth();
  return useQuery<Portfolio[]>({
    queryKey: ['portfolios'],
    queryFn: () => listPortfolios(token!),
    enabled: !!token,
    staleTime: 60_000,
  });
}
