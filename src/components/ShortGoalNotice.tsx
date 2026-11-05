import { TriangleAlert } from 'lucide-react';
import type { CashComparison } from '../domain/goal/result';
import { SHORT_GOAL_YEARS } from '../domain/goal/result';
import { fmtAmount, fmtRate } from '../utils/format';
import './ShortGoalNotice.css';

interface ShortGoalNoticeProps {
  kind: 'projection' | 'target';
  comparison: CashComparison;
  expectedReturnPct: number;
  currency: string;
}

const RISK = 'one bad year in the market could leave you short when you need the money.';

/**
 * Informational notice for goals under `SHORT_GOAL_YEARS`: the plan at the expected return
 * next to keeping cash (0%), so the user can weigh what investing saves against its risk.
 * It never blocks anything on the page.
 */
export default function ShortGoalNotice({ kind, comparison, expectedReturnPct, currency }: ShortGoalNoticeProps) {
  const { invested, cash, benefit } = comparison;
  const amt = (n: number) => fmtAmount(n, currency);
  const rate = fmtRate(expectedReturnPct);
  const perMonth = kind === 'target' ? ' a month' : '';
  // Judge the sign on the figure as shown (whole units), so "about 0" never reads as a saving.
  const shown = benefit == null ? null : Number(benefit.toFixed(0));

  let text: string;
  if (invested == null || shown == null) {
    text = `At ${rate} no monthly amount reaches the target. In cash you need ${amt(cash)} a month.`;
  } else {
    const first = kind === 'target'
      ? `At ${rate} you need ${amt(invested)} a month. In cash you need ${amt(cash)}.`
      : `At ${rate} you could have ${amt(invested)}. In cash you would have ${amt(cash)}.`;
    const verb = kind === 'target' ? 'saves' : 'adds';
    const second = shown > 0
      ? `Investing ${verb} about ${amt(shown)}${perMonth}, but ${RISK}`
      : shown < 0
        ? kind === 'target'
          ? `At this return investing costs about ${amt(-shown)} more a month, and ${RISK}`
          : `At this return investing leaves you about ${amt(-shown)} less, and ${RISK}`
        : `Investing ${verb} nothing over cash, and ${RISK}`;
    text = `${first} ${second}`;
  }

  return (
    <aside className="short-goal-notice" role="note" aria-labelledby="short-goal-title" data-testid="short-goal-notice">
      <TriangleAlert className="short-goal-icon" aria-hidden="true" />
      <div className="short-goal-body">
        <h2 id="short-goal-title" className="short-goal-title">
          Under {SHORT_GOAL_YEARS} years: investing or cash?
        </h2>
        <p className="short-goal-text">{text}</p>
      </div>
    </aside>
  );
}
