import type { Goal } from '../api/goals';
import { DEFAULT_GOAL_FORM } from './goalInputs';
import { draftToBody, goalHeadline, goalToDraft, NEW_GOAL_DRAFT, sameDraft, saveProblem } from './savedGoal';

const goal: Goal = {
  id: 'g1',
  name: 'Retirement',
  kind: 'projection',
  currency: 'THB',
  startingAmount: 0,
  monthlyAmount: 10000,
  targetAmount: null,
  years: 30,
  expectedReturn: 8,
  contributionGrowth: null,
  inflation: 3,
  volatility: 16.5,
  portfolioId: 'p1',
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
};

describe('goalToDraft', () => {
  it('loads every stored input as form text, with empty fields for null and a 0 starting amount', () => {
    expect(goalToDraft(goal)).toEqual({
      form: {
        kind: 'projection',
        name: 'Retirement',
        currency: 'THB',
        startingAmount: '',
        monthlyAmount: '10000',
        targetAmount: '',
        years: '30',
        expectedReturn: '8',
        contributionGrowth: '',
        inflation: '3',
        volatility: '16.5',
      },
      portfolioId: 'p1',
    });
  });

  it('keeps 0 for fields where 0 is a real value', () => {
    const { form } = goalToDraft({ ...goal, expectedReturn: 0, inflation: 0, contributionGrowth: 0, portfolioId: null });
    expect(form.expectedReturn).toBe('0');
    expect(form.inflation).toBe('0');
    expect(form.contributionGrowth).toBe('0');
  });
});

describe('draftToBody', () => {
  it('round-trips a saved goal', () => {
    expect(draftToBody(goalToDraft(goal))).toEqual({
      name: goal.name,
      kind: goal.kind,
      currency: goal.currency,
      startingAmount: goal.startingAmount,
      monthlyAmount: goal.monthlyAmount,
      targetAmount: goal.targetAmount,
      years: goal.years,
      expectedReturn: goal.expectedReturn,
      contributionGrowth: goal.contributionGrowth,
      inflation: goal.inflation,
      volatility: goal.volatility,
      portfolioId: goal.portfolioId,
    });
  });

  it('keeps a volatility of 0, and sends an empty or missing one as null', () => {
    expect(draftToBody(goalToDraft({ ...goal, volatility: 0 })).volatility).toBe(0);
    expect(goalToDraft({ ...goal, volatility: 0 }).form.volatility).toBe('0');
    expect(draftToBody(goalToDraft({ ...goal, volatility: null })).volatility).toBeNull();
    // Goals from a backend without the field load as empty.
    const { volatility: _omit, ...older } = goal;
    void _omit;
    expect(goalToDraft(older).form.volatility).toBe('');
  });

  it('flags a changed volatility as unsaved', () => {
    const draft = goalToDraft(goal);
    expect(sameDraft(draft, { ...draft, form: { ...draft.form, volatility: '20' } })).toBe(false);
    expect(sameDraft(draft, goalToDraft(goal))).toBe(true);
  });

  it('sends empty optional fields as null and no link as null', () => {
    const body = draftToBody({
      form: { ...DEFAULT_GOAL_FORM, name: '  House ', kind: 'target', targetAmount: '1000000', years: '3', expectedReturn: '8', inflation: '' },
      portfolioId: '',
    });
    expect(body).toMatchObject({
      name: 'House',
      kind: 'target',
      startingAmount: 0,
      monthlyAmount: null,
      targetAmount: 1000000,
      contributionGrowth: null,
      inflation: null,
      portfolioId: null,
    });
  });

  it('keeps the other mode’s amount only when it is a positive number', () => {
    const form = { ...goalToDraft(goal).form, targetAmount: '500000' };
    expect(draftToBody({ form, portfolioId: '' }).targetAmount).toBe(500000);
    expect(draftToBody({ form: { ...form, targetAmount: '0' }, portfolioId: '' }).targetAmount).toBeNull();
    expect(draftToBody({ form: { ...form, kind: 'target', monthlyAmount: '-5' }, portfolioId: '' }).monthlyAmount).toBeNull();
  });
});

describe('saveProblem', () => {
  it('asks for whole years, which is all the backend stores', () => {
    expect(saveProblem({ ...DEFAULT_GOAL_FORM, years: '2.5' })).toMatch(/whole years/);
    expect(saveProblem({ ...DEFAULT_GOAL_FORM, years: '3' })).toBeNull();
  });
});

describe('sameDraft', () => {
  it('compares every field and the link', () => {
    const a = goalToDraft(goal);
    expect(sameDraft(a, goalToDraft(goal))).toBe(true);
    expect(sameDraft(a, { ...a, portfolioId: '' })).toBe(false);
    expect(sameDraft(a, { ...a, form: { ...a.form, years: '31' } })).toBe(false);
    expect(sameDraft(NEW_GOAL_DRAFT, { form: { ...DEFAULT_GOAL_FORM }, portfolioId: '' })).toBe(true);
  });
});

describe('goalHeadline', () => {
  it('gives the final value for a projection (≈ 14.9M for the epic example)', () => {
    const h = goalHeadline(goal)!;
    expect(h.kind).toBe('projection');
    expect(h.value).toBeGreaterThan(14_900_000);
    expect(h.value).toBeLessThan(15_000_000);
  });

  it('gives the monthly amount needed for a target', () => {
    const h = goalHeadline({ ...goal, kind: 'target', targetAmount: 1_000_000, years: 3 })!;
    expect(h.kind).toBe('target');
    expect(h.value).toBeGreaterThan(24_000);
    expect(h.value).toBeLessThan(25_000);
  });

  it('is undefined when the stored inputs no longer pass the checks', () => {
    expect(goalHeadline({ ...goal, expectedReturn: 80 })).toBeUndefined();
  });
});
