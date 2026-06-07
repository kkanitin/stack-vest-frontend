import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getBatchHistory } from '../api/stocks';
import type { BatchHistoryItem } from '../api/stocks';

export function useComparisonData(
  symbols: string[],
  range: '7D' | '30D' | '90D' | '1Y' | 'All'
): { data: BatchHistoryItem[] | undefined; isLoading: boolean; isError: boolean; refetch: () => void } {
  const { token } = useAuth();
  const sorted = useMemo(() => [...symbols].sort(), [symbols]);

  const q = useQuery({
    queryKey: ['batchHistory', sorted, range],
    queryFn: () => getBatchHistory(token!, sorted, range),
    enabled: !!token && sorted.length > 0,
    staleTime: 10 * 60 * 1000,
  });

  return { data: q.data, isLoading: q.isLoading, isError: q.isError, refetch: q.refetch };
}
