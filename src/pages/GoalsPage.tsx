import React from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { useGoals } from '../hooks/useGoals';
import { useGoalMutations } from '../hooks/useGoalMutations';
import { usePortfolios } from '../hooks/usePortfolios';
import { useToast } from '../context/ToastContext';
import type { Goal } from '../api/goals';
import GoalCard, { type GoalCardLink } from '../components/GoalCard';
import './GoalsPage.css';

/** Saved goals (KAN-22): one card per goal, results calculated in the browser. */
const GoalsPage: React.FC = () => {
  const goals = useGoals();
  const portfolios = usePortfolios();
  const { remove } = useGoalMutations();
  const toast = useToast();

  const list = goals.data ?? [];

  const linkFor = (goal: Goal): GoalCardLink => {
    if (!goal.portfolioId) return null;
    const portfolio = portfolios.data?.find(p => p.id === goal.portfolioId);
    if (portfolio) return { name: portfolio.name };
    // Only say "removed" once the portfolios are known; until then show nothing.
    return portfolios.data ? 'removed' : null;
  };

  const handleDelete = (goal: Goal) => {
    remove.mutate(goal.id, {
      onSuccess: () => toast.success('Goal deleted'),
      onError: err => toast.error(err instanceof Error && err.message ? err.message : 'Failed to delete goal'),
    });
  };

  return (
    <div className="goals">
      <header className="goals-head">
        <div className="goals-head-text">
          <h1 className="goals-title">Goals</h1>
          <p className="goals-sub">Your saved goals. Open one to see the full plan or change it.</p>
        </div>
        {list.length > 0 && (
          <Button asChild>
            <Link to="/dashboard/goals/new">+ New goal</Link>
          </Button>
        )}
      </header>

      {goals.isError && (
        <div className="goals-banner" role="alert">
          {goals.error instanceof Error ? goals.error.message : 'Failed to load goals'}{' '}
          <button type="button" className="goals-retry" onClick={() => goals.refetch()}>Try again</button>
        </div>
      )}

      {goals.isPending ? (
        <div className="goals-grid" data-testid="goals-loading">
          {[0, 1, 2].map(i => <div key={i} className="goals-card-skel" />)}
        </div>
      ) : goals.isSuccess && list.length === 0 ? (
        <div className="goals-empty" data-testid="goals-empty">
          <h2 className="goals-empty-title">No goals yet</h2>
          <p className="goals-empty-text">
            Work out what you could have, or what you need to save each month, and keep it here.
          </p>
          <Button asChild>
            <Link to="/dashboard/goals/new">Create your first goal</Link>
          </Button>
        </div>
      ) : (
        <div className="goals-grid">
          {list.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              link={linkFor(goal)}
              onDelete={handleDelete}
              deleting={remove.isPending && remove.variables === goal.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default GoalsPage;
