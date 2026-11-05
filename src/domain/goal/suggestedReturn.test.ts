import type { SuggestedReturn } from '../../api/portfolios';
import {
  describeSuggestion,
  isSuggestedRate,
  lookbackYears,
  suggestedRate,
  suggestedRateText,
  suggestedVolatility,
} from './suggestedReturn';

function make(over: Partial<SuggestedReturn> = {}): SuggestedReturn {
  return {
    available: true,
    annualReturn: 7.4,
    lookback: { startDate: '2016-11-04', endDate: '2026-11-03', years: 10, requestedYears: 10, shortHistory: false },
    holdings: [],
    skipped: [],
    priceBasisNote: 'Price movement only.',
    ...over,
  };
}

describe('suggestedReturn helpers', () => {
  it('reads the rate only when a suggestion is available', () => {
    expect(suggestedRate(make())).toBe(7.4);
    expect(suggestedRate(make({ available: false, annualReturn: null, lookback: null }))).toBeNull();
    expect(suggestedRate(undefined)).toBeNull();
  });

  it('writes the rate for the field with at most two decimals', () => {
    expect(suggestedRateText(7.4)).toBe('7.4');
    expect(suggestedRateText(7.456)).toBe('7.46');
    expect(suggestedRateText(-2)).toBe('-2');
  });

  it('tells whether the field already holds the suggestion', () => {
    expect(isSuggestedRate('7.40', 7.4)).toBe(true);
    expect(isSuggestedRate(' 7.4 ', 7.4)).toBe(true);
    expect(isSuggestedRate('8', 7.4)).toBe(false);
    expect(isSuggestedRate('', 0)).toBe(false);
  });

  it('describes where the suggestion came from', () => {
    expect(describeSuggestion(make())).toBe('Suggested 7.4% a year from your holdings, 2016–2026, price only.');
    expect(lookbackYears(make({ lookback: { startDate: '2026-01-02', endDate: '2026-10-01', years: 0.8, requestedYears: 10, shortHistory: true } }))).toBe('2026');
    expect(describeSuggestion(make({ available: false, annualReturn: null, lookback: null }))).toBeNull();
  });

  it('reads the volatility only alongside a suggested return', () => {
    expect(suggestedVolatility(make({ annualVolatility: 15.2 }))).toBe(15.2);
    expect(suggestedVolatility(make({ annualVolatility: null }))).toBeNull();
    expect(suggestedVolatility(make())).toBeNull();
    expect(suggestedVolatility(make({ available: false, annualReturn: null, annualVolatility: 15 }))).toBeNull();
  });

  it('names the volatility in the description when there is one', () => {
    expect(describeSuggestion(make({ annualVolatility: 15 }))).toBe(
      'Suggested 7.4% a year, ±15% volatility, from your holdings, 2016–2026, price only.',
    );
  });
});
