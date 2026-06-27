import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getDividendCalendar } from '../api/dividends';
import type { DividendEvent } from '../api/dividends';

/** Upcoming dividend payouts for the user's holdings, backed by
 *  `GET /dividends/calendar`. The window is small (~75 days) and the endpoint returns
 *  the full default window when unparameterized, so we fetch once (stable key) and
 *  group/filter client-side. Refreshed ~daily server-side, hence the long staleTime. */
export function useDividendCalendar(): {
  data: DividendEvent[] | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
} {
  const { token } = useAuth();

  const q = useQuery({
    queryKey: ['dividendCalendar'],
    queryFn: () => getDividendCalendar(token!),
    enabled: !!token,
    staleTime: 60 * 60 * 1000,
  });

  return {
    data: q.data,
    isLoading: q.isLoading,
    isError: q.isError,
    refetch: q.refetch,
  };
}
