import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getFearGreedIndex } from '../api/sentiment';
import type { FearGreedIndex } from '../api/sentiment';

export function useFearGreedIndex() {
  const { token } = useAuth();
  return useQuery<FearGreedIndex>({
    queryKey: ['sentiment', 'fearGreed'],
    queryFn: () => getFearGreedIndex(token!),
    enabled: !!token,
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
