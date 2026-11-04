import { describeFxRate } from '../api/fx';
import type { GoalProgressReady, GoalProgressState } from '../hooks/useGoalProgress';
import { fmtAmount } from './format';
import { ON_TRACK_TOLERANCE_PCT, type ProgressStatus } from './goalProgress';

/** Words shared by the goal card and the goal page's progress panel (KAN-29, KAN-30). */

export const PROGRESS_STATUS_LABEL: Record<ProgressStatus, string> = {
  ahead: 'Ahead',
  'on-track': 'On track',
  behind: 'Behind',
};

/** An amount in the goal's currency, marked "≈" when it was converted at today's rate. */
export function fmtProgressAmount(p: GoalProgressReady, amount: number, currency: string): string {
  return `${p.fx ? '≈ ' : ''}${fmtAmount(amount, currency)}`;
}

/** "Behind by 12,400 THB", "Ahead by 3,000 THB", or "Within 2% of the plan". */
export function progressGapText(p: GoalProgressReady, currency: string): string {
  if (p.status === 'on-track') return `Within ${ON_TRACK_TOLERANCE_PCT}% of the plan`;
  const amount = fmtProgressAmount(p, Math.abs(p.gap), currency);
  return `${PROGRESS_STATUS_LABEL[p.status]} by ${amount}`;
}

/** The rate used, for a tooltip or a note; null in the same currency. */
export function progressRateText(p: GoalProgressReady): string | null {
  return p.fx ? `Converted at ${describeFxRate(p.fx)}` : null;
}

/** How full the progress bar is: the value as a share of the plan today, 0–100. */
export function progressBarPct(p: GoalProgressReady): number {
  if (p.percentOfPlan == null) return p.actual > 0 ? 100 : 0;
  return Math.max(0, Math.min(100, p.percentOfPlan));
}

/**
 * A short line for the states that have no figures yet; null for `ready` and for the states
 * that show nothing (`not-linked`, and `portfolio-removed`, which has its own message).
 */
export function progressStateNote(p: GoalProgressState): string | null {
  switch (p.state) {
    case 'loading':
      return 'Checking progress…';
    case 'no-value':
      return p.retry ? 'Could not load the portfolio value.' : 'No portfolio value yet.';
    case 'fx-unavailable':
      return p.reason === 'unsupported'
        ? `Can't convert ${p.to}: use a currency code such as THB or USD to track progress.`
        : `Could not load today's ${p.from} to ${p.to} rate.`;
    case 'unreachable':
      return 'No plan to compare with.';
    default:
      return null;
  }
}
