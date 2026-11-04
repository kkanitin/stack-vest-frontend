import type { SuggestedReturn } from '../api/portfolios';
import { fmtRate } from './format';

/** The suggested yearly return in percent, or null when the response has none. */
export function suggestedRate(s: SuggestedReturn | undefined): number | null {
  if (!s || !s.available || s.annualReturn == null || !Number.isFinite(s.annualReturn)) return null;
  return s.annualReturn;
}

/** The text put in the expected-return field, e.g. "7.4" (at most 2 decimals, no trailing zeros). */
export function suggestedRateText(rate: number): string {
  return String(Number(rate.toFixed(2)));
}

/** Whether the field's text is the suggested rate (so "Use suggested" has nothing to do). */
export function isSuggestedRate(fieldText: string, rate: number): boolean {
  const t = fieldText.trim();
  return t !== '' && Number(t) === Number(rate.toFixed(2));
}

/** "2016–2026" from the lookback dates, or a single year when both fall in the same one. */
export function lookbackYears(s: SuggestedReturn): string | null {
  if (!s.lookback) return null;
  const start = s.lookback.startDate.slice(0, 4);
  const end = s.lookback.endDate.slice(0, 4);
  if (!/^\d{4}$/.test(start) || !/^\d{4}$/.test(end)) return null;
  return start === end ? start : `${start}–${end}`;
}

/** "Suggested 7.4% a year from your holdings, 2016–2026, price only." */
export function describeSuggestion(s: SuggestedReturn): string | null {
  const rate = suggestedRate(s);
  if (rate == null) return null;
  const period = lookbackYears(s);
  return `Suggested ${fmtRate(rate)} a year from your holdings${period ? `, ${period}` : ''}, price only.`;
}
