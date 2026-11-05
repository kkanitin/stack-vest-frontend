import { DEFAULT_GOAL_FORM } from './inputs';
import {
  applySuggestions,
  initialSuggestedFields,
  linkChanged,
  markTyped,
  restoreSuggestion,
} from './suggestedFields';

const both = { expectedReturn: 7.4, volatility: 15 };

describe('suggestedFields', () => {
  it('fills empty fields once per suggestion', () => {
    const first = applySuggestions(initialSuggestedFields(false), DEFAULT_GOAL_FORM, 'p1', both)!;
    expect(first.form.expectedReturn).toBe('7.4');
    expect(first.form.volatility).toBe('15');
    expect(applySuggestions(first.state, first.form, 'p1', both)).toBeNull();
  });

  it('does nothing without suggestions', () => {
    const none = { expectedReturn: null, volatility: null };
    expect(applySuggestions(initialSuggestedFields(false), DEFAULT_GOAL_FORM, 'p1', none)).toBeNull();
  });

  it('never overwrites a typed value, but fills a typed field left empty', () => {
    const state = markTyped(initialSuggestedFields(false), 'volatility');
    const typed = applySuggestions(state, { ...DEFAULT_GOAL_FORM, volatility: '22' }, 'p1', both)!;
    expect(typed.form.volatility).toBe('22');
    expect(typed.form.expectedReturn).toBe('7.4');
    const empty = applySuggestions(state, DEFAULT_GOAL_FORM, 'p1', both)!;
    expect(empty.form.volatility).toBe('15');
    expect(empty.state.typed.volatility).toBe(false);
  });

  it('treats a saved goal as typed', () => {
    const form = { ...DEFAULT_GOAL_FORM, expectedReturn: '6', volatility: '12' };
    const step = applySuggestions(initialSuggestedFields(true), form, 'p1', both)!;
    expect(step.form).toEqual(form);
  });

  it('clears filled values when the link changes and refills from the new portfolio', () => {
    const filled = applySuggestions(initialSuggestedFields(false), DEFAULT_GOAL_FORM, 'p1', both)!;
    const typedReturn = { state: markTyped(filled.state, 'expectedReturn'), form: { ...filled.form, expectedReturn: '9' } };
    const changed = linkChanged(typedReturn.state, typedReturn.form);
    expect(changed.form.expectedReturn).toBe('9');
    expect(changed.form.volatility).toBe('');
    const refilled = applySuggestions(changed.state, changed.form, 'p2', { expectedReturn: 5, volatility: 20 })!;
    expect(refilled.form.expectedReturn).toBe('9');
    expect(refilled.form.volatility).toBe('20');
  });

  it('puts a suggestion back and makes the field filled-in again', () => {
    const state = markTyped(initialSuggestedFields(false), 'volatility');
    const restored = restoreSuggestion(state, { ...DEFAULT_GOAL_FORM, volatility: '30' }, 'volatility', 15.256);
    expect(restored.form.volatility).toBe('15.26');
    expect(restored.state.typed.volatility).toBe(false);
    expect(linkChanged(restored.state, restored.form).form.volatility).toBe('');
  });
});
