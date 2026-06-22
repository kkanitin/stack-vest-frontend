import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getCompanyProfile } from '../api/stocks';
import type { CompanyProfile } from '../api/stocks';

export function useCompanyProfile(
  symbol: string | null
): { data: CompanyProfile | undefined; isLoading: boolean; isError: boolean; refetch: () => void } {
  const { token } = useAuth();

  const q = useQuery({
    queryKey: ['companyProfile', symbol],
    queryFn: () => getCompanyProfile(token!, symbol!),
    enabled: !!token && !!symbol,
    staleTime: 30 * 60 * 1000,
  });

  return { data: q.data, isLoading: q.isLoading, isError: q.isError, refetch: q.refetch };
}
