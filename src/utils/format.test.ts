import { changeTone, fmtPct, fmtRelativeTime, fmtSignedMoney } from './format';

describe('fmtRelativeTime', () => {
  const now = new Date('2026-10-01T12:00:00Z');

  it('steps from minutes to hours to days', () => {
    expect(fmtRelativeTime('2026-10-01T11:59:40Z', now)).toBe('just now');
    expect(fmtRelativeTime('2026-10-01T11:55:00Z', now)).toBe('5m ago');
    expect(fmtRelativeTime('2026-10-01T09:00:00Z', now)).toBe('3h ago');
    expect(fmtRelativeTime('2026-09-29T12:00:00Z', now)).toBe('2d ago');
  });

  it('falls back to a date after a week, with the year when it differs', () => {
    expect(fmtRelativeTime('2026-09-12T12:00:00Z', now)).toBe('Sep 12');
    expect(fmtRelativeTime('2025-09-12T12:00:00Z', now)).toBe('Sep 12, 2025');
  });

  it('treats a timestamp slightly in the future as just now', () => {
    expect(fmtRelativeTime('2026-10-01T12:00:30Z', now)).toBe('just now');
  });

  it('returns an empty string for an unparseable timestamp', () => {
    expect(fmtRelativeTime('', now)).toBe('');
  });
});

describe('changeTone', () => {
  it('reads the sign of a figure that survives rounding', () => {
    expect(changeTone(1.5)).toBe('positive');
    expect(changeTone(-1.5)).toBe('negative');
  });

  it('is neutral for zero and for anything that displays as zero', () => {
    expect(changeTone(0)).toBe('neutral');
    expect(changeTone(-0.004)).toBe('neutral');
    expect(changeTone(0.004)).toBe('neutral');
  });

  it('judges the value at the precision it is displayed with', () => {
    expect(changeTone(0.04, 1)).toBe('neutral');
    expect(changeTone(0.04, 2)).toBe('positive');
  });

  it('is neutral for missing or non-finite input', () => {
    expect(changeTone(null)).toBe('neutral');
    expect(changeTone(undefined)).toBe('neutral');
    expect(changeTone(NaN)).toBe('neutral');
  });
});

describe('fmtPct', () => {
  it('signs gains and losses', () => {
    expect(fmtPct(1.234)).toBe('+1.23%');
    expect(fmtPct(-1.234)).toBe('-1.23%');
  });

  it('shows an unsigned zero, never "+0.00%" or "-0.00%"', () => {
    expect(fmtPct(0)).toBe('0.00%');
    expect(fmtPct(-0.004)).toBe('0.00%');
  });

  it('honours the requested precision', () => {
    expect(fmtPct(1.26, 1)).toBe('+1.3%');
    expect(fmtPct(0.04, 1)).toBe('0.0%');
  });
});

describe('fmtSignedMoney', () => {
  it('signs gains and losses and leaves zero unsigned', () => {
    expect(fmtSignedMoney(12.5)).toBe('+$12.50');
    expect(fmtSignedMoney(-12.5)).toBe('-$12.50');
    expect(fmtSignedMoney(0)).toBe('$0.00');
    expect(fmtSignedMoney(-0.004)).toBe('$0.00');
  });

  it('shows a dash for missing input', () => {
    expect(fmtSignedMoney(undefined)).toBe('—');
  });
});
