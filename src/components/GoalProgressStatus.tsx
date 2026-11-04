import React from 'react';
import { CircleCheck, TrendingDown, TrendingUp } from 'lucide-react';
import type { ProgressStatus } from '../utils/goalProgress';
import { PROGRESS_STATUS_LABEL } from '../utils/goalProgressText';
import './GoalProgressStatus.css';

const ICON: Record<ProgressStatus, React.ElementType> = {
  ahead: TrendingUp,
  'on-track': CircleCheck,
  behind: TrendingDown,
};

/** On track / Ahead / Behind: a text label with an icon, so the status is not colour only. */
export const GoalStatusChip: React.FC<{ status: ProgressStatus }> = ({ status }) => {
  const Icon = ICON[status];
  return (
    <span className={`goal-status goal-status--${status}`} data-testid="goal-status">
      <Icon className="goal-status-icon" aria-hidden="true" />
      {PROGRESS_STATUS_LABEL[status]}
    </span>
  );
};

/** The portfolio's value as a share of where the plan should be today. */
export const GoalProgressBar: React.FC<{ pct: number; status: ProgressStatus; label: string }> = ({
  pct,
  status,
  label,
}) => {
  const rounded = Math.round(pct);
  return (
    <div
      className="goal-progress-bar"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={rounded}
      aria-valuetext={`${rounded}% of where the plan should be today`}
    >
      <div className={`goal-progress-bar-fill goal-progress-bar-fill--${status}`} style={{ width: `${pct}%` }} />
    </div>
  );
};
