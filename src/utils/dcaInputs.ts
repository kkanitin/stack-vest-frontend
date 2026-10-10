import type { DcaFrequency } from '../api/simulations';

/** Mirrors `maxDateRangeYears` in the backend DCA handler. */
export const MAX_RANGE_YEARS: Record<DcaFrequency, number> = {
  daily: 5,
  weekly: 15,
  biweekly: 20,
  monthly: 30,
};

export const DEFAULT_RANGE_YEARS = 3;

export interface DcaInputs {
  amount: string;
  frequency: DcaFrequency;
  start: string;
  end: string;
}

export interface DcaInputErrors {
  amount?: string;
  start?: string;
  end?: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Today as YYYY-MM-DD in UTC — the backend rejects an end date after its own UTC "today". */
export function todayUtc(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** `date` (YYYY-MM-DD) shifted by whole calendar years, in UTC. Same normalisation as Go's `AddDate`. */
export function addYears(date: string, years: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y + years, m - 1, d)).toISOString().slice(0, 10);
}

/** The three years ending today. */
export function defaultRange(now: Date = new Date()): { start: string; end: string } {
  const end = todayUtc(now);
  return { start: addYears(end, -DEFAULT_RANGE_YEARS), end };
}

function isRealDate(s: string): boolean {
  return ISO_DATE.test(s) && !Number.isNaN(Date.parse(s));
}

/** Field-level problems with `inputs`; an empty object means a simulation may run. */
export function validateInputs(inputs: DcaInputs, now: Date = new Date()): DcaInputErrors {
  const errors: DcaInputErrors = {};

  const amount = inputs.amount.trim() === '' ? NaN : Number(inputs.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    errors.amount = 'Enter an amount greater than 0.';
  }

  const startOk = isRealDate(inputs.start);
  const endOk = isRealDate(inputs.end);
  if (!startOk) errors.start = 'Enter a valid start date.';
  if (!endOk) errors.end = 'Enter a valid end date.';
  if (!startOk || !endOk) return errors;

  // YYYY-MM-DD strings compare chronologically.
  if (inputs.end > todayUtc(now)) {
    errors.end = 'End date cannot be in the future.';
  } else if (inputs.start >= inputs.end) {
    errors.start = 'Start date must be before the end date.';
  } else {
    const maxYears = MAX_RANGE_YEARS[inputs.frequency];
    if (inputs.end > addYears(inputs.start, maxYears)) {
      errors.end = `Range is too long for ${inputs.frequency === 'biweekly' ? 'bi-weekly' : inputs.frequency} purchases (max ${maxYears} years).`;
    }
  }
  return errors;
}
