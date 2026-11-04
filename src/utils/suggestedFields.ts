import type { GoalFormInputs } from './goalInputs';
import { suggestedRateText } from './suggestedReturn';

/**
 * Form fields a linked portfolio can fill in (KAN-21, KAN-34). They share one set of rules:
 *
 * - A value the user typed is never overwritten; a new suggestion is only offered.
 * - An empty field counts as not typed and is filled.
 * - A value the app filled in follows the link: it is cleared when the portfolio changes or
 *   the link is removed, then refilled from the new portfolio's suggestion.
 * - "Use suggested" puts the suggestion back and makes the field filled-in again.
 */
export type SuggestedField = 'expectedReturn' | 'volatility';

export const SUGGESTED_FIELDS: readonly SuggestedField[] = ['expectedReturn', 'volatility'];

export interface SuggestedFieldsState {
  /** The user typed the field themselves. */
  typed: Record<SuggestedField, boolean>;
  /** The last suggestion applied, as `portfolioId:value`, so each new one is applied once. */
  applied: Record<SuggestedField, string | null>;
}

/** Each suggested value for the linked portfolio, or null when there is none. */
export type SuggestedValues = Record<SuggestedField, number | null>;

/** Fresh state. A saved goal's values count as typed: a suggestion never overwrites them. */
export function initialSuggestedFields(typed: boolean): SuggestedFieldsState {
  return {
    typed: { expectedReturn: typed, volatility: typed },
    applied: { expectedReturn: null, volatility: null },
  };
}

interface Step {
  state: SuggestedFieldsState;
  form: GoalFormInputs;
}

/**
 * Applies each suggestion not applied yet for this portfolio. Returns the new state and form,
 * or null when nothing changes (so the page can call it while rendering).
 */
export function applySuggestions(
  state: SuggestedFieldsState,
  form: GoalFormInputs,
  portfolioId: string,
  values: SuggestedValues,
): Step | null {
  let next: Step | null = null;
  for (const field of SUGGESTED_FIELDS) {
    const value = values[field];
    if (value == null) continue;
    const key = `${portfolioId}:${value}`;
    if (key === state.applied[field]) continue;
    const cur: Step = next ?? {
      state: { typed: { ...state.typed }, applied: { ...state.applied } },
      form: { ...form },
    };
    cur.state.applied[field] = key;
    if (!cur.state.typed[field] || cur.form[field].trim() === '') {
      cur.form[field] = suggestedRateText(value);
      cur.state.typed[field] = false;
    }
    next = cur;
  }
  return next;
}

/** The link changed: filled-in values belonged to the old portfolio, so they are cleared. */
export function linkChanged(state: SuggestedFieldsState, form: GoalFormInputs): Step {
  const nextForm = { ...form };
  for (const field of SUGGESTED_FIELDS) {
    if (!state.typed[field]) nextForm[field] = '';
  }
  return {
    state: { typed: { ...state.typed }, applied: { expectedReturn: null, volatility: null } },
    form: nextForm,
  };
}

/** The user typed in `field`. */
export function markTyped(state: SuggestedFieldsState, field: SuggestedField): SuggestedFieldsState {
  return state.typed[field] ? state : { ...state, typed: { ...state.typed, [field]: true } };
}

/** "Use suggested": put the suggestion back in `field`. */
export function restoreSuggestion(state: SuggestedFieldsState, form: GoalFormInputs, field: SuggestedField, value: number): Step {
  return {
    state: { ...state, typed: { ...state.typed, [field]: false } },
    form: { ...form, [field]: suggestedRateText(value) },
  };
}
