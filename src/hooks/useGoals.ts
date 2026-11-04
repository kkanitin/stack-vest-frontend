import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getGoal, GoalNotFoundError, listGoals } from '../api/goals';
import type { Goal } from '../api/goals';

export const GOALS_KEY = ['goals'] as const;
export const goalKey = (id: string | undefined) => ['goal', id] as const;

/** Every saved goal of the user, newest first. */
export function useGoals() {
  const { token } = useAuth();
  return useQuery<Goal[]>({
    queryKey: GOALS_KEY,
    queryFn: () => listGoals(token!),
    enabled: !!token,
    staleTime: 60_000,
  });
}

/** One saved goal; idle while `id` is undefined. A missing goal is not retried. */
export function useGoal(id: string | undefined) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useQuery<Goal>({
    queryKey: goalKey(id),
    queryFn: () => getGoal(token!, id!),
    enabled: !!token && !!id,
    staleTime: 60_000,
    retry: (count, err) => !(err instanceof GoalNotFoundError) && count < 1,
    // Opening a goal from the list shows it at once.
    placeholderData: () => queryClient.getQueryData<Goal[]>(GOALS_KEY)?.find(g => g.id === id),
  });
}
