import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getBenchmarks } from '../api/portfolios';
import type { Benchmark } from '../api/portfolios';

/** The comparison indices the backend offers. A fixed list, so it is fetched once per session. */
export function useBenchmarks() {
  const { token } = useAuth();
  return useQuery<Benchmark[]>({
    queryKey: ['benchmarks'],
    queryFn: () => getBenchmarks(token!),
    enabled: !!token,
    staleTime: Infinity,
  });
}
