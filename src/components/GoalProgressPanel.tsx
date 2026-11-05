import React from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import type { Goal } from '../api/goals';
import { useGoalProgress } from '../hooks/useGoalProgress';
import { fmtAmount } from '../utils/format';
import { fmtProgressAmount, progressBarPct, progressGapText, progressRateText, progressStateNote } from '../domain/goal/progressText';
import { GoalProgressBar, GoalStatusChip } from './GoalProgressStatus';
import './GoalProgressPanel.css';

interface Props {
  /** The saved goal, never the unsaved form. */
  goal: Goal;
  /** The form has unsaved changes: say that progress follows the saved goal. */
  unsaved?: boolean;
}

function fmtPct(n: number): string {
  return `${Number(n.toFixed(1))}%`;
}

function fmtSignedAmount(n: number, currency: string, approx: boolean): string {
  const sign = Math.round(n) > 0 ? '+' : '';
  return `${approx ? '≈ ' : ''}${sign}${fmtAmount(n, currency)}`;
}

/**
 * Progress card on a saved goal's page (KAN-30): the linked portfolio's value against where the
 * plan says it should be today. Renders nothing for unlinked goals or a removed portfolio.
 */
const GoalProgressPanel: React.FC<Props> = ({ goal, unsaved = false }) => {
  const progress = useGoalProgress(goal);
  if (progress.state === 'not-linked' || progress.state === 'portfolio-removed') return null;

  const currency = goal.currency.trim();
  const savedNote = unsaved && (
    <p className="goal-progress-saved-note" data-testid="goal-progress-unsaved">
      Progress follows the saved goal. Save your changes to update it.
    </p>
  );

  if (progress.state !== 'ready') {
    const retry = 'retry' in progress ? progress.retry : undefined;
    return (
      <Card className="goal-progress px-6" data-testid="goal-progress" aria-labelledby="goal-progress-title">
        <CardTitle id="goal-progress-title" className="label-caps">Progress</CardTitle>
        <p className="goal-progress-note" role="status">
          {progressStateNote(progress)}
          {retry && (
            <button type="button" className="goal-progress-retry" onClick={retry}>Try again</button>
          )}
        </p>
        {savedNote}
      </Card>
    );
  }

  const approx = !!progress.fx;
  const rate = progressRateText(progress);
  const isTarget = goal.kind === 'target';

  return (
    <Card className="goal-progress px-6" data-testid="goal-progress" aria-labelledby="goal-progress-title">
      <div className="goal-progress-head">
        <CardTitle id="goal-progress-title" className="label-caps">Progress</CardTitle>
        <GoalStatusChip status={progress.status} />
      </div>
      <p className="goal-progress-gap" data-testid="goal-progress-gap">{progressGapText(progress, currency)}</p>
      <GoalProgressBar
        pct={progressBarPct(progress)}
        status={progress.status}
        label="Portfolio value against the plan today"
      />

      <dl className="goal-progress-figures">
        <div>
          <dt>{progress.portfolio.name} now</dt>
          <dd data-testid="goal-progress-value">
            {fmtAmount(progress.portfolioValue, progress.portfolioCurrency)}
            {approx && (
              <span className="goal-progress-converted"> {fmtProgressAmount(progress, progress.actual, currency)}</span>
            )}
          </dd>
        </div>
        <div>
          <dt>Plan for today</dt>
          <dd data-testid="goal-progress-plan">{fmtAmount(progress.plan.planValue, currency)}</dd>
        </div>
        <div>
          <dt>Gap</dt>
          <dd>{fmtSignedAmount(progress.gap, currency, approx)}</dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>{progress.plan.monthsElapsed} of {progress.plan.totalMonths} months</dd>
        </div>
        {isTarget && progress.percentOfTarget != null && (
          <div>
            <dt>Of target</dt>
            <dd data-testid="goal-progress-target">{fmtPct(progress.percentOfTarget)}</dd>
          </div>
        )}
      </dl>

      {rate && <p className="goal-progress-rate" data-testid="goal-progress-rate">{rate}. Today's rate only.</p>}
      <p className="goal-progress-basis">
        In future money at {goal.expectedReturn}% a year, from the day the goal was saved.
      </p>
      {savedNote}
    </Card>
  );
};

export default GoalProgressPanel;
