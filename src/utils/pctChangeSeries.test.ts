import { describe, expect, it } from 'vitest';
import { pctChangeSeries } from './pctChangeSeries';

describe('pctChangeSeries', () => {
  it('rebases both series to 0% on the first row', () => {
    const rows = pctChangeSeries([
      { date: '2026-09-01', value: 1000, returnPct: 0, benchmarkClose: 100 },
      { date: '2026-09-02', value: 1100, returnPct: 10, benchmarkClose: 95 },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ date: '2026-09-01', portfolioPct: 0, benchmarkPct: 0 });
    expect(rows[1].portfolioPct).toBeCloseTo(10);
    expect(rows[1].benchmarkPct).toBeCloseTo(-5);
  });

  it('uses the time-weighted return, not value, so deposits do not count as gains', () => {
    const rows = pctChangeSeries([
      { date: '2026-09-01', value: 1000, returnPct: 5, benchmarkClose: 100 },
      { date: '2026-09-02', value: 2100, returnPct: 7.1, benchmarkClose: 100 },
    ]);
    // (1.071 / 1.05 - 1) = 2%; the value jump from a deposit is ignored.
    expect(rows[1].portfolioPct).toBeCloseTo(2);
    expect(rows[1].value).toBe(2100);
  });

  it('drops rows before the portfolio had value or the benchmark had a close', () => {
    const rows = pctChangeSeries([
      { date: '2026-09-01', value: 0, returnPct: 0, benchmarkClose: 100 },
      { date: '2026-09-02', value: 500, returnPct: 0 },
      { date: '2026-09-03', value: 500, returnPct: 0, benchmarkClose: null },
      { date: '2026-09-04', value: 500, returnPct: 0, benchmarkClose: 200 },
      { date: '2026-09-05', value: 550, returnPct: 10, benchmarkClose: 210 },
    ]);

    expect(rows.map(r => r.date)).toEqual(['2026-09-04', '2026-09-05']);
    expect(rows[1].portfolioPct).toBeCloseTo(10);
    expect(rows[1].benchmarkPct).toBeCloseTo(5);
  });

  it('treats a non-finite close like a missing one', () => {
    const rows = pctChangeSeries([
      { date: '2026-09-01', value: 100, returnPct: 0, benchmarkClose: Number.NaN },
      { date: '2026-09-02', value: 100, returnPct: 0, benchmarkClose: 50 },
    ]);
    expect(rows.map(r => r.date)).toEqual(['2026-09-02']);
  });

  it('skips a base row whose benchmark close is 0', () => {
    const rows = pctChangeSeries([
      { date: '2026-09-01', value: 1000, returnPct: 0, benchmarkClose: 0 },
      { date: '2026-09-02', value: 1000, returnPct: 1, benchmarkClose: 50 },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ date: '2026-09-02', benchmarkPct: 0 });
  });

  it('skips a base row at returnPct -100 and returns [] if none remain', () => {
    const rows = pctChangeSeries([
      { date: '2026-09-01', value: 10, returnPct: -100, benchmarkClose: 100 },
      { date: '2026-09-02', value: 20, returnPct: -50, benchmarkClose: 110 },
    ]);
    expect(rows.map(r => r.date)).toEqual(['2026-09-02']);
    expect(Number.isFinite(rows[0].portfolioPct)).toBe(true);
    expect(pctChangeSeries([{ date: '2026-09-01', value: 10, returnPct: -100, benchmarkClose: 100 }])).toEqual([]);
  });

  it('returns nothing when no row qualifies', () => {
    expect(pctChangeSeries([])).toEqual([]);
    expect(pctChangeSeries([{ date: '2026-09-01', value: 100, returnPct: 0 }])).toEqual([]);
    expect(pctChangeSeries([{ date: '2026-09-01', value: 0, returnPct: 0, benchmarkClose: 10 }])).toEqual([]);
  });
});
