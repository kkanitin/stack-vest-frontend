import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { createGoal, deleteGoal, updateGoal } from '../api/goals';
import type { Goal, GoalBody } from '../api/goals';
import { GOALS_KEY, goalKey } from './useGoals';

/**
 * Create, update and delete saved goals. Each one writes the result into the cache
 * (`['goal', id]` and `['goals']`) and then refetches the list.
 */
export function useGoalMutations() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const store = (goal: Goal) => {
    queryClient.setQueryData(goalKey(goal.id), goal);
    queryClient.setQueryData<Goal[]>(GOALS_KEY, old =>
      old && (old.some(g => g.id === goal.id) ? old.map(g => (g.id === goal.id ? goal : g)) : [goal, ...old]),
    );
  };
  const refreshList = () => queryClient.invalidateQueries({ queryKey: GOALS_KEY });

  const create = useMutation({
    mutationFn: (body: GoalBody) => createGoal(token!, body),
    onSuccess: store,
    onSettled: refreshList,
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: GoalBody }) => updateGoal(token!, id, body),
    onSuccess: store,
    onSettled: refreshList,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteGoal(token!, id),
    onSuccess: (_void, id) => {
      queryClient.removeQueries({ queryKey: goalKey(id), exact: true });
      queryClient.setQueryData<Goal[]>(GOALS_KEY, old => old?.filter(g => g.id !== id));
    },
    onSettled: refreshList,
  });

  return { create, update, remove };
}
