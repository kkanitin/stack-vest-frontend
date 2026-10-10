import { addYears, defaultRange, todayUtc, validateInputs } from './dcaInputs';
import type { DcaInputs } from './dcaInputs';

const NOW = new Date('2026-10-09T12:00:00Z');

const valid: DcaInputs = { amount: '100', frequency: 'weekly', start: '2024-10-09', end: '2026-10-09' };

describe('dcaInputs', () => {
  it('defaults to the three years ending today (UTC)', () => {
    expect(todayUtc(NOW)).toBe('2026-10-09');
    expect(defaultRange(NOW)).toEqual({ start: '2023-10-09', end: '2026-10-09' });
  });

  it('accepts valid inputs, including an end date of today', () => {
    expect(validateInputs(valid, NOW)).toEqual({});
  });

  it.each(['', '   ', '0', '-5', 'abc'])('rejects amount %j', amount => {
    expect(validateInputs({ ...valid, amount }, NOW).amount).toBeDefined();
  });

  it('rejects half-typed or empty dates', () => {
    expect(validateInputs({ ...valid, start: '' }, NOW).start).toBeDefined();
    expect(validateInputs({ ...valid, end: '0002-10-09x' }, NOW).end).toBeDefined();
  });

  it('rejects an end date in the future', () => {
    expect(validateInputs({ ...valid, end: '2026-10-10' }, NOW).end).toMatch(/future/);
  });

  it('rejects a start that is not before the end', () => {
    expect(validateInputs({ ...valid, start: '2026-10-09' }, NOW).start).toBeDefined();
    expect(validateInputs({ ...valid, start: '2026-10-10', end: '2026-10-09' }, NOW).start).toBeDefined();
  });

  it('enforces the range limit per frequency, allowing exactly the limit', () => {
    const daily = { ...valid, frequency: 'daily' as const };
    expect(validateInputs({ ...daily, start: '2021-10-09' }, NOW)).toEqual({});
    expect(validateInputs({ ...daily, start: '2021-10-08' }, NOW).end).toMatch(/5 years/);
    expect(validateInputs({ ...valid, frequency: 'monthly', start: '1996-10-09' }, NOW)).toEqual({});
    expect(validateInputs({ ...valid, frequency: 'monthly', start: '1996-10-08' }, NOW).end).toMatch(/30 years/);
    expect(validateInputs({ ...valid, frequency: 'biweekly', start: '2006-10-08' }, NOW).end).toMatch(/bi-weekly/);
  });

  it('shifts years like the backend (Feb 29 rolls to Mar 1)', () => {
    expect(addYears('2024-02-29', 1)).toBe('2025-03-01');
  });
});
