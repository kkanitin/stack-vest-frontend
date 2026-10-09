import { useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { listTransactions } from '../api/transactions';
import type { TransactionPage } from '../api/transactions';

/** Rows per request; well under the backend's 100 maximum. */
export const TX_PAGE_SIZE = 20;

/**
 * The portfolio's newest ledger rows across all holdings, optionally narrowed to one symbol.
 * Pages accumulate (`fetchNextPage` appends older rows); `data` is the flattened list plus the
 * server's total. The previous list stays on screen while a new filter loads.
 */
export function usePortfolioTransactions(portfolioId: string | undefined, opts: { symbol?: string } = {}) {
  const { token } = useAuth();
  const { symbol } = opts;
  return useInfiniteQuery<TransactionPage, Error, TransactionPage, unknown[], number>({
    queryKey: ['portfolio', portfolioId, 'transactions', 'list', symbol ?? null],
    queryFn: ({ pageParam }) =>
      listTransactions(token!, portfolioId!, { symbol, page: pageParam, size: TX_PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((n, p) => n + p.transactions.length, 0);
      const more = last.total != null ? loaded < last.total : last.transactions.length >= TX_PAGE_SIZE;
      return more && last.transactions.length > 0 ? all.length + 1 : undefined;
    },
    select: (data: InfiniteData<TransactionPage, number>): TransactionPage => ({
      transactions: data.pages.flatMap(p => p.transactions),
      total: data.pages[data.pages.length - 1]?.total,
    }),
    placeholderData: keepPreviousData,
    enabled: !!token && !!portfolioId,
    staleTime: 30_000,
  });
}
