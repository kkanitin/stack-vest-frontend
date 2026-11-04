import type { Goal, GoalBody } from '../api/goals';
import {
  DEFAULT_GOAL_FORM,
  hasErrors,
  parseGoalInputs,
  validateGoalInputs,
  type GoalFormInputs,
  type GoalKind,
} from './goalInputs';
import { computeGoalResult } from './goalResult';

/** What a saved goal holds, as the calculator edits it: the form plus the portfolio link ('' = none). */
export interface GoalDraft {
  form: GoalFormInputs;
  portfolioId: string;
}

export const NEW_GOAL_DRAFT: GoalDraft = { form: DEFAULT_GOAL_FORM, portfolioId: '' };

export const GOAL_KIND_LABEL: Record<GoalKind, string> = {
  projection: 'How much will I have?',
  target: 'How much must I save?',
};

/** A stored number as form text; `null` (and 0 for the "empty means 0" fields) becomes ''. */
function text(n: number | null | undefined, emptyWhenZero = false): string {
  if (n == null || !Number.isFinite(n)) return '';
  if (emptyWhenZero && n === 0) return '';
  return String(n);
}

/** Loads a saved goal into the calculator form. */
export function goalToDraft(goal: Goal): GoalDraft {
  return {
    form: {
      kind: goal.kind,
      name: goal.name,
      currency: goal.currency,
      startingAmount: text(goal.startingAmount, true),
      monthlyAmount: text(goal.monthlyAmount),
      targetAmount: text(goal.targetAmount),
      years: text(goal.years),
      expectedReturn: text(goal.expectedReturn),
      contributionGrowth: text(goal.contributionGrowth),
      inflation: text(goal.inflation),
    },
    portfolioId: goal.portfolioId ?? '',
  };
}

/** `null` for an empty or non-numeric field. */
function numberOrNull(t: string): number | null {
  const s = t.trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** An amount the current mode does not use: kept when it is a positive number, otherwise cleared. */
function spareAmount(t: string): number | null {
  const n = numberOrNull(t);
  return n != null && n > 0 ? n : null;
}

/**
 * Why the draft cannot be saved even though the calculator can show results, or null. The
 * calculator takes part years; the backend stores whole years only.
 */
export function saveProblem(form: GoalFormInputs): string | null {
  const years = Number(form.years.trim());
  if (Number.isFinite(years) && !Number.isInteger(years)) {
    return 'Saved goals use whole years. Change Years to a whole number to save.';
  }
  return null;
}

/**
 * The request body for a valid draft (call only once `validateGoalInputs` has no errors and
 * `saveProblem` is null). Both amounts are kept so switching modes after loading loses
 * neither; an empty optional field is sent as `null`.
 */
export function draftToBody(draft: GoalDraft): GoalBody {
  const { form } = draft;
  const isTarget = form.kind === 'target';
  return {
    name: form.name.trim(),
    kind: form.kind,
    currency: form.currency.trim(),
    startingAmount: numberOrNull(form.startingAmount) ?? 0,
    monthlyAmount: isTarget ? spareAmount(form.monthlyAmount) : numberOrNull(form.monthlyAmount),
    targetAmount: isTarget ? numberOrNull(form.targetAmount) : spareAmount(form.targetAmount),
    years: Number(form.years.trim()),
    expectedReturn: Number(form.expectedReturn.trim()),
    contributionGrowth: numberOrNull(form.contributionGrowth),
    inflation: numberOrNull(form.inflation),
    portfolioId: draft.portfolioId || null,
  };
}

/** True when the two drafts hold the same inputs. */
export function sameDraft(a: GoalDraft, b: GoalDraft): boolean {
  if (a.portfolioId !== b.portfolioId) return false;
  return (Object.keys(a.form) as (keyof GoalFormInputs)[]).every(k => a.form[k] === b.form[k]);
}

/**
 * The headline result for a saved goal, calculated in the browser in future money: the final
 * value (projection) or the monthly amount needed (target; null when no amount reaches it).
 * Undefined when the stored inputs no longer pass the calculator's checks.
 */
export function goalHeadline(goal: Goal): { kind: GoalKind; value: number | null } | undefined {
  const { form } = goalToDraft(goal);
  if (hasErrors(validateGoalInputs(form))) return undefined;
  const result = computeGoalResult(parseGoalInputs(form), false);
  return { kind: result.kind, value: result.headline };
}
