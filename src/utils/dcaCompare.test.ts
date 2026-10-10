import { describeCompare, pctAt, toSeries, unionDates } from './dcaCompare';
import type { DcaResult } from '../api/simulations';

function result(symbol: string, points: [string, number][]): DcaResult {
  return {
    symbol,
    dataPoints: points.map(([date, returnPct]) => ({
      date, returnPct, price: 1, unitsPurchased: 0, totalUnits: 0, totalInvested: 0, portfolioValue: 0,
    })),
  } as unknown as DcaResult;
}

const a = result('AAA', [['2024-01-02', 0], ['2024-02-01', 5], ['2024-03-01', 10]]);
const b = result('BBB', [['2024-01-03', 0], ['2024-03-01', -4]]);

describe('dcaCompare', () => {
  it('turns results into coloured percentage-return series, in order', () => {
    const series = toSeries([a, b]);
    expect(series.map(s => s.symbol)).toEqual(['AAA', 'BBB']);
    expect(series[0].color).not.toBe(series[1].color);
    expect(series[0].points[2]).toEqual({ date: '2024-03-01', pct: 10 });
  });

  it('merges dates across series without duplicates', () => {
    expect(unionDates(toSeries([a, b]))).toEqual(['2024-01-02', '2024-01-03', '2024-02-01', '2024-03-01']);
  });

  it('reads a series as of a date: latest point on or before it, none before its start', () => {
    const [sa, sb] = toSeries([a, b]);
    expect(pctAt(sa, '2024-02-15')).toBe(5);
    expect(pctAt(sa, '2024-03-01')).toBe(10);
    expect(pctAt(sb, '2024-01-02')).toBeUndefined();
    expect(pctAt(sb, '2024-02-01')).toBe(0);
  });

  it('describes the final returns of each asset for screen readers', () => {
    const text = describeCompare(toSeries([a, b]));
    expect(text).toContain('Jan 2, 2024 to Mar 1, 2024');
    expect(text).toContain('AAA +10.00%, BBB -4.00%');
  });

  it('copes with no data', () => {
    expect(describeCompare([])).toMatch(/no data/);
  });
});
