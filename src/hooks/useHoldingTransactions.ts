import { useInfiniteQuery } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { listTransactions } from '../api/transactions';
import type { Transaction, TransactionPage } from '../api/transactions';

/** The backend rejects `size` above 100 with a 400. */
export const HOLDING_TX_PAGE_SIZE = 100;

/**
 * One holding's ledger rows, newest first. Pages of 100 (the backend maximum) accumulate;
 * call `fetchNextPage` while `hasNextPage` to load older rows.
 */
export function useHoldingTransactions(portfolioId: string | undefined, symbol: string | undefined) {
  const { token } = useAuth();
  return useInfiniteQuery<TransactionPage, Error, Transaction[], unknown[], number>({
    queryKey: ['portfolio', portfolioId, 'transactions', 'holding', symbol],
    queryFn: ({ pageParam }) =>
      listTransactions(token!, portfolioId!, { symbol, page: pageParam, size: HOLDING_TX_PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((n, p) => n + p.transactions.length, 0);
      const more = last.total != null ? loaded < last.total : last.transactions.length >= HOLDING_TX_PAGE_SIZE;
      return more && last.transactions.length > 0 ? all.length + 1 : undefined;
    },
    select: (data: InfiniteData<TransactionPage, number>) => data.pages.flatMap(p => p.transactions),
    enabled: !!token && !!portfolioId && !!symbol,
    staleTime: 30_000,
  });
}
