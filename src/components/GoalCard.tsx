import React, { useState } from 'react';
import { Link } from 'react-router';
import type { Goal } from '../api/goals';
import { fmtAmount } from '../utils/format';
import { GOAL_KIND_LABEL, goalHeadline } from '../domain/goal/savedGoal';
import InlineConfirm from './InlineConfirm';
import { GoalProgressBar, GoalStatusChip } from './GoalProgressStatus';
import { useGoalProgress } from '../hooks/useGoalProgress';
import { progressBarPct, progressGapText, progressRateText, progressStateNote } from '../domain/goal/progressText';
import './GoalCard.css';

/** The linked portfolio: its name, `removed` when it no longer exists, null when not linked. */
export type GoalCardLink = { name: string } | 'removed' | null;

interface Props {
  goal: Goal;
  link: GoalCardLink;
  onDelete: (goal: Goal) => void;
  deleting?: boolean;
}

function fmtYears(n: number): string {
  return `${n} ${n === 1 ? 'year' : 'years'}`;
}

/** Compact progress for a linked goal (KAN-29): status, a bar against the plan today and the gap. */
const GoalCardProgress: React.FC<{ goal: Goal }> = ({ goal }) => {
  const progress = useGoalProgress(goal);

  if (progress.state !== 'ready') {
    const note = progressStateNote(progress);
    if (!note) return null;
    const retry = 'retry' in progress ? progress.retry : undefined;
    return (
      <div className="goal-card-progress-note" data-testid="goal-card-progress">
        {note}
        {retry && (
          <button
            type="button"
            className="goal-card-retry"
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              retry();
            }}
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  const rate = progressRateText(progress);
  return (
    <div className="goal-card-progress" data-testid="goal-card-progress">
      <div className="goal-card-progress-top">
        <GoalStatusChip status={progress.status} />
        <span className="goal-card-gap" title={rate ?? undefined}>
          {progressGapText(progress, goal.currency)}
        </span>
      </div>
      <GoalProgressBar
        pct={progressBarPct(progress)}
        status={progress.status}
        label={`${goal.name}: portfolio value against the plan today`}
      />
    </div>
  );
};

/** One saved goal in the list: opens it in the calculator, with an in-card delete confirmation. */
const GoalCard: React.FC<Props> = ({ goal, link, onDelete, deleting = false }) => {
  const [confirming, setConfirming] = useState(false);
  const headline = goalHeadline(goal);
  const isTarget = goal.kind === 'target';

  let value: string;
  if (!headline) value = '—';
  else if (headline.value == null) value = 'Not reachable';
  else value = `${fmtAmount(headline.value, goal.currency)}${isTarget ? ' / month' : ''}`;

  return (
    <Link to={`/dashboard/goals/${goal.id}`} className="goal-card" data-testid="goal-card">
      <div className="goal-card-top">
        <h3 className="goal-card-name">{goal.name}</h3>
        <button
          type="button"
          className="goal-card-delete"
          aria-label={`Delete ${goal.name}`}
          disabled={deleting}
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            setConfirming(true);
          }}
        >
          Delete
        </button>
      </div>

      <div className="goal-card-meta">
        <span className="goal-card-kind">{GOAL_KIND_LABEL[goal.kind]}</span>
        <span aria-hidden="true">·</span>
        <span>{fmtYears(goal.years)}</span>
      </div>

      <div className="goal-card-result">
        <div className="goal-card-result-label">{isTarget ? 'Monthly amount needed' : 'Final value'}</div>
        <div className="goal-card-result-value" data-testid="goal-card-result">{value}</div>
        <div className="goal-card-result-sub">at {goal.expectedReturn}% a year, in future money</div>
      </div>

      {link === 'removed' && (
        <div className="goal-card-link goal-card-link--removed">Linked portfolio removed</div>
      )}
      {link && link !== 'removed' && <div className="goal-card-link">Linked to {link.name}</div>}
      {link && link !== 'removed' && <GoalCardProgress goal={goal} />}

      {confirming && (
        <InlineConfirm
          message={`Delete “${goal.name}”? This cannot be undone.`}
          confirmLabel="Delete goal"
          danger
          busy={deleting}
          onConfirm={() => onDelete(goal)}
          onCancel={() => setConfirming(false)}
        />
      )}
    </Link>
  );
};

export default GoalCard;
