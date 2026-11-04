import type { ProjectionInputs, TargetInputs } from './goalMath';

export type GoalKind = 'projection' | 'target';

/**
 * The goal form as typed. Numbers stay as text so clearing a field is not turned into 0.
 * Both `monthlyAmount` and `targetAmount` are kept whatever the mode, so switching modes
 * back and forth does not lose either value.
 */
export interface GoalFormInputs {
  kind: GoalKind;
  name: string;
  currency: string;
  startingAmount: string;
  monthlyAmount: string;
  targetAmount: string;
  years: string;
  expectedReturn: string;
  contributionGrowth: string;
  inflation: string;
}

export type GoalInputErrors = Partial<Record<Exclude<keyof GoalFormInputs, 'kind'>, string>>;

export const DEFAULT_INFLATION = '3';
export const DEFAULT_CURRENCY = 'THB';
export const MAX_CURRENCY_LENGTH = 10;
export const MAX_NAME_LENGTH = 100;
export const MAX_YEARS = 100;
/** Bounds for the percentage fields (return, contribution growth, inflation). */
export const MIN_RATE_PCT = -50;
export const MAX_RATE_PCT = 50;

export const DEFAULT_GOAL_FORM: GoalFormInputs = {
  kind: 'projection',
  name: '',
  currency: DEFAULT_CURRENCY,
  startingAmount: '',
  monthlyAmount: '',
  targetAmount: '',
  years: '',
  expectedReturn: '',
  contributionGrowth: '',
  inflation: DEFAULT_INFLATION,
};

/** `NaN` for empty or non-numeric text, so `Number('')` never becomes 0. */
function toNumber(text: string): number {
  const t = text.trim();
  return t === '' ? NaN : Number(t);
}

/** Empty optional field = 0; otherwise the parsed number (NaN when not numeric). */
function optionalNumber(text: string): number {
  return text.trim() === '' ? 0 : Number(text.trim());
}

function rateError(value: number, label: string): string | undefined {
  if (!Number.isFinite(value)) return `Enter ${label} as a number.`;
  if (value < MIN_RATE_PCT || value > MAX_RATE_PCT) {
    return `Enter ${label} between ${MIN_RATE_PCT}% and ${MAX_RATE_PCT}%.`;
  }
  return undefined;
}

/**
 * Field-level problems with `inputs`; an empty object means results may be shown.
 * Only the amount field the current mode uses is checked.
 */
export function validateGoalInputs(inputs: GoalFormInputs): GoalInputErrors {
  const errors: GoalInputErrors = {};

  const name = inputs.name.trim();
  if (name === '') errors.name = 'Enter a name for this goal.';
  else if (name.length > MAX_NAME_LENGTH) errors.name = `Keep the name to ${MAX_NAME_LENGTH} characters or fewer.`;

  const currency = inputs.currency.trim();
  if (currency === '') errors.currency = 'Enter a currency label, e.g. THB or USD.';
  else if (currency.length > MAX_CURRENCY_LENGTH) {
    errors.currency = `Keep the currency label to ${MAX_CURRENCY_LENGTH} characters or fewer.`;
  }

  const starting = optionalNumber(inputs.startingAmount);
  if (!Number.isFinite(starting) || starting < 0) {
    errors.startingAmount = 'Enter a starting amount of 0 or more, or leave it empty.';
  }

  if (inputs.kind === 'projection') {
    const monthly = toNumber(inputs.monthlyAmount);
    if (!Number.isFinite(monthly) || monthly <= 0) errors.monthlyAmount = 'Enter a monthly amount greater than 0.';
  } else {
    const target = toNumber(inputs.targetAmount);
    if (!Number.isFinite(target) || target <= 0) errors.targetAmount = 'Enter a target amount greater than 0.';
  }

  const years = toNumber(inputs.years);
  if (!Number.isFinite(years) || years <= 0) errors.years = 'Enter a number of years greater than 0.';
  else if (years > MAX_YEARS) errors.years = `Enter ${MAX_YEARS} years or fewer.`;
  else if (Math.round(years * 12) < 1) errors.years = 'Enter at least one month (about 0.1 years).';

  if (inputs.expectedReturn.trim() === '') {
    errors.expectedReturn = 'Enter the expected yearly return, e.g. 7.';
  } else {
    const e = rateError(Number(inputs.expectedReturn.trim()), 'the expected return');
    if (e) errors.expectedReturn = e;
  }

  const growthError = rateError(optionalNumber(inputs.contributionGrowth), 'the yearly increase');
  if (growthError) errors.contributionGrowth = growthError;

  const inflationError = rateError(optionalNumber(inputs.inflation), 'inflation');
  if (inflationError) errors.inflation = inflationError;

  return errors;
}

export function hasErrors(errors: GoalInputErrors): boolean {
  return Object.keys(errors).length > 0;
}

export interface ParsedGoal {
  kind: GoalKind;
  name: string;
  currency: string;
  years: number;
  inflationPct: number;
  projection: ProjectionInputs;
  target: TargetInputs;
}

/** Numbers for the goal maths. Call only once `validateGoalInputs` returns no errors. */
export function parseGoalInputs(inputs: GoalFormInputs): ParsedGoal {
  const shared = {
    startingAmount: optionalNumber(inputs.startingAmount),
    years: Number(inputs.years.trim()),
    annualReturnPct: Number(inputs.expectedReturn.trim()),
    contributionGrowthPct: optionalNumber(inputs.contributionGrowth),
  };
  return {
    kind: inputs.kind,
    name: inputs.name.trim(),
    currency: inputs.currency.trim(),
    years: shared.years,
    inflationPct: optionalNumber(inputs.inflation),
    projection: { ...shared, monthlyAmount: toNumber(inputs.monthlyAmount) },
    target: { ...shared, targetAmount: toNumber(inputs.targetAmount) },
  };
}
