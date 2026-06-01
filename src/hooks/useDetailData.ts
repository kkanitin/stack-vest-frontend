import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getAssetDetail } from '../api/stocks';
import type { AssetDetail, DetailRange } from '../api/stocks';

export function useDetailData(
  symbol: string | null,
  range: DetailRange
): { data: AssetDetail | undefined; isLoading: boolean; isError: boolean; refetch: () => void } {
  const { token } = useAuth();

  const q = useQuery({
    queryKey: ['assetDetail', symbol, range],
    queryFn: () => getAssetDetail(token!, symbol!, range),
    enabled: !!token && !!symbol,
    staleTime: range === '1D' ? 2 * 60 * 1000 : 10 * 60 * 1000,
    refetchInterval: range === '1D' ? 120_000 : false,
  });

  return { data: q.data, isLoading: q.isLoading, isError: q.isError, refetch: q.refetch };
}
