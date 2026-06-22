import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getStockHistory } from '../api/stocks';
import type { StockHistory } from '../api/stocks';

export type HistoryRange = '1M' | '3M' | '6M' | '1Y';

/** Historical close prices for a single symbol, backed by
 *  `GET /stocks/:symbol/history`. Keyed by symbol + range so switching the
 *  range re-fetches; `keepPreviousData` avoids the chart blanking on toggle. */
export function useStockHistory(
  symbol: string | null,
  range: HistoryRange
): { data: StockHistory | undefined; isLoading: boolean; isFetching: boolean; isError: boolean; refetch: () => void } {
  const { token } = useAuth();

  const q = useQuery({
    queryKey: ['stockHistory', symbol, range],
    queryFn: () => getStockHistory(token!, symbol!, range),
    enabled: !!token && !!symbol,
    staleTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  return {
    data: q.data,
    isLoading: q.isLoading,
    isFetching: q.isFetching,
    isError: q.isError,
    refetch: q.refetch,
  };
}
