import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getPortfolioValueHistory } from '../api/portfolios';
import type { ValueHistory, ValueHistoryRange } from '../api/portfolios';

export function usePortfolioValueHistory(range: ValueHistoryRange, benchmark: string | null) {
  const { token } = useAuth();
  return useQuery<ValueHistory>({
    // Under ['portfolios'] so the invalidations fired by position and portfolio edits reach it.
    queryKey: ['portfolios', 'history', range, benchmark ?? 'none'],
    queryFn: () => getPortfolioValueHistory(token!, range, benchmark),
    enabled: !!token,
    // The server records every few hours; refetching more often than every few minutes buys nothing.
    staleTime: 5 * 60_000,
    // Keep the previous range on screen while the next one loads instead of flashing a skeleton.
    placeholderData: keepPreviousData,
  });
}
