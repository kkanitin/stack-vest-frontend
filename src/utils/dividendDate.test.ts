import { describe, it, expect } from 'vitest';
import { ymd, isAbsent, parseYmd, makeKey, formatLongDate, formatMonthLabel } from './dividendDate';

describe('dividendDate', () => {
  it('takes the calendar-date prefix regardless of time/zone', () => {
    // The classic landmine: new Date(iso).getDate() shifts west of UTC. ymd must not.
    expect(ymd('2026-07-15T00:00:00Z')).toBe('2026-07-15');
    expect(ymd('2026-12-31T00:00:00Z')).toBe('2026-12-31');
  });

  it('treats year-0001 dates as absent', () => {
    expect(isAbsent('0001-01-01T00:00:00Z')).toBe(true);
    expect(isAbsent('')).toBe(true);
    expect(isAbsent(null)).toBe(true);
    expect(isAbsent('2026-07-15T00:00:00Z')).toBe(false);
  });

  it('parses the prefix into integer parts', () => {
    expect(parseYmd('2026-07-15T00:00:00Z')).toEqual({ y: 2026, m: 7, d: 15 });
  });

  it('builds a zero-padded key', () => {
    expect(makeKey(2026, 7, 5)).toBe('2026-07-05');
    expect(makeKey(2026, 12, 31)).toBe('2026-12-31');
  });

  it('formats labels from integers (no UTC parse)', () => {
    const long = formatLongDate(2026, 6, 30);
    expect(long).toContain('June');
    expect(long).toContain('30');
    expect(formatMonthLabel(2026, 6)).toBe('June 2026');
  });
});
