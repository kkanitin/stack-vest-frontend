import {
  DEFAULT_GOAL_FORM,
  hasErrors,
  parseGoalInputs,
  validateGoalInputs,
  type GoalFormInputs,
} from './goalInputs';

const valid: GoalFormInputs = {
  ...DEFAULT_GOAL_FORM,
  name: 'Retirement',
  monthlyAmount: '10000',
  years: '30',
  expectedReturn: '8',
};

describe('validateGoalInputs', () => {
  it('accepts a complete projection goal', () => {
    expect(validateGoalInputs(valid)).toEqual({});
  });

  it('accepts a complete target goal without a monthly amount', () => {
    const target = { ...valid, kind: 'target' as const, monthlyAmount: '', targetAmount: '1000000' };
    expect(validateGoalInputs(target)).toEqual({});
  });

  it('starts with errors on the empty default form', () => {
    expect(hasErrors(validateGoalInputs(DEFAULT_GOAL_FORM))).toBe(true);
  });

  it('requires a name and a currency label', () => {
    const errors = validateGoalInputs({ ...valid, name: '  ', currency: '' });
    expect(errors.name).toBeDefined();
    expect(errors.currency).toBeDefined();
  });

  it('rejects a currency label longer than 10 characters', () => {
    expect(validateGoalInputs({ ...valid, currency: 'ABCDEFGHIJK' }).currency).toBeDefined();
  });

  it('requires only the amount the current mode uses', () => {
    expect(validateGoalInputs({ ...valid, monthlyAmount: '' }).monthlyAmount).toBeDefined();
    const target = validateGoalInputs({ ...valid, kind: 'target', targetAmount: '' });
    expect(target.targetAmount).toBeDefined();
    expect(target.monthlyAmount).toBeUndefined();
  });

  it.each(['0', '-5', 'abc'])('rejects a monthly amount of %s', amount => {
    expect(validateGoalInputs({ ...valid, monthlyAmount: amount }).monthlyAmount).toBeDefined();
  });

  it('treats an empty starting amount as 0 but rejects a negative one', () => {
    expect(validateGoalInputs({ ...valid, startingAmount: '' }).startingAmount).toBeUndefined();
    expect(validateGoalInputs({ ...valid, startingAmount: '-1' }).startingAmount).toBeDefined();
  });

  it.each([
    ['', true],
    ['0', true],
    ['0.01', true],
    ['2.5', false],
    ['100', false],
    ['101', true],
  ])('years %s gives an error: %s', (years, bad) => {
    expect(!!validateGoalInputs({ ...valid, years }).years).toBe(bad);
  });

  it('requires the expected return but allows 0% and negative returns', () => {
    expect(validateGoalInputs({ ...valid, expectedReturn: '' }).expectedReturn).toBeDefined();
    expect(validateGoalInputs({ ...valid, expectedReturn: '0' }).expectedReturn).toBeUndefined();
    expect(validateGoalInputs({ ...valid, expectedReturn: '-3' }).expectedReturn).toBeUndefined();
    expect(validateGoalInputs({ ...valid, expectedReturn: '60' }).expectedReturn).toBeDefined();
  });

  it('lets contribution growth and inflation be empty but not out of range', () => {
    expect(validateGoalInputs({ ...valid, contributionGrowth: '', inflation: '' })).toEqual({});
    const errors = validateGoalInputs({ ...valid, contributionGrowth: 'x', inflation: '99' });
    expect(errors.contributionGrowth).toBeDefined();
    expect(errors.inflation).toBeDefined();
  });
});

describe('parseGoalInputs', () => {
  it('turns the text into numbers, with empty optional fields as 0', () => {
    const parsed = parseGoalInputs({ ...valid, startingAmount: '', contributionGrowth: '', inflation: '' });
    expect(parsed.projection).toEqual({
      startingAmount: 0,
      monthlyAmount: 10000,
      years: 30,
      annualReturnPct: 8,
      contributionGrowthPct: 0,
    });
    expect(parsed.inflationPct).toBe(0);
    expect(parsed.currency).toBe('THB');
  });

  it('carries the target amount for target mode', () => {
    const parsed = parseGoalInputs({ ...valid, kind: 'target', targetAmount: '1000000', inflation: '3' });
    expect(parsed.target.targetAmount).toBe(1000000);
    expect(parsed.inflationPct).toBe(3);
  });
});
