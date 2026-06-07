import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getBatchHistory } from '../api/stocks';
import type { BatchHistoryItem } from '../api/stocks';

export function useSparklineData(
  symbols: string[],
  lookback: '7D' | '30D' | '90D'
): { data: BatchHistoryItem[] | undefined; isLoading: boolean } {
  const { token } = useAuth();
  const sorted = useMemo(() => [...symbols].sort(), [symbols]);

  const q = useQuery({
    queryKey: ['batchHistory', sorted, lookback],
    queryFn: () => getBatchHistory(token!, sorted, lookback),
    enabled: !!token && sorted.length > 0,
    staleTime: 10 * 60 * 1000,
  });

  return { data: q.data, isLoading: q.isLoading };
}
