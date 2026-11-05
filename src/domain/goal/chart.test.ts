import {
  describeGoalChart,
  fmtCompact,
  fmtYearLabel,
  goalChartPoints,
  niceCeil,
  valueTicks,
  yearTicks,
} from './chart';
import { projectGoal, toTodaysMoney } from './math';

const plan = { startingAmount: 1000, monthlyAmount: 100, years: 3, annualReturnPct: 8 };
const returns = { low: 6, expected: 8, high: 10 };

describe('goalChartPoints', () => {
  it('gives a point per year, from the starting amount to the end', () => {
    const pts = goalChartPoints(plan, returns);
    expect(pts.map(p => p.year)).toEqual([0, 1, 2, 3]);
    expect(pts[0]).toEqual({ year: 0, invested: 1000, value: { low: 1000, expected: 1000, high: 1000 } });
    expect(pts[3].invested).toBe(1000 + 36 * 100);
  });

  it('ends at the projected value at each return, with low < expected < high', () => {
    const last = goalChartPoints(plan, returns).at(-1)!;
    expect(last.value.expected).toBeCloseTo(projectGoal(plan).finalValue, 6);
    expect(last.value.low).toBeCloseTo(projectGoal({ ...plan, annualReturnPct: 6 }).finalValue, 6);
    expect(last.value.low).toBeLessThan(last.value.expected);
    expect(last.value.expected).toBeLessThan(last.value.high);
  });

  it("deflates each point by its own year in today's money", () => {
    const nominal = goalChartPoints(plan, returns);
    const real = goalChartPoints(plan, returns, 3);
    expect(real[0].invested).toBe(1000);
    expect(real[2].value.expected).toBeCloseTo(toTodaysMoney(nominal[2].value.expected, 2, 3), 6);
    expect(real[3].invested).toBeCloseTo(toTodaysMoney(nominal[3].invested, 3, 3), 6);
  });

  it('ends on a part year when years is not whole', () => {
    const pts = goalChartPoints({ ...plan, years: 1.5 }, returns);
    expect(pts.map(p => p.year)).toEqual([0, 1, 1.5]);
  });
});

describe('yearTicks', () => {
  it('labels round steps within the label budget', () => {
    expect(yearTicks(30, 6)).toEqual([0, 10, 20, 30]);
    expect(yearTicks(10, 6)).toEqual([0, 2, 4, 6, 8, 10]);
    expect(yearTicks(30, 3)).toEqual([0, 20]);
    expect(yearTicks(3, 6)).toEqual([0, 1, 2, 3]);
    expect(yearTicks(2.5, 6)).toEqual([0, 1, 2]);
    expect(yearTicks(0.5, 6)).toEqual([0]);
  });

  it('never exceeds the label budget', () => {
    for (let y = 1; y <= 100; y++) {
      expect(yearTicks(y, 3).length).toBeLessThanOrEqual(3);
      expect(yearTicks(y, 6).length).toBeLessThanOrEqual(6);
    }
  });
});

describe('formatting helpers', () => {
  it('labels years', () => {
    expect(fmtYearLabel(0)).toBe('Now');
    expect(fmtYearLabel(5)).toBe('Year 5');
    expect(fmtYearLabel(2.5)).toBe('Year 2.5');
  });

  it('rounds the axis maximum up to a round number', () => {
    expect(niceCeil(0)).toBe(1);
    expect(niceCeil(14_900_000)).toBe(20_000_000);
    expect(niceCeil(2_100_000)).toBe(2_500_000);
    expect(niceCeil(5000)).toBe(5000);
  });

  it('puts value gridlines on round steps up to at least the maximum', () => {
    expect(valueTicks(22_604_879)).toEqual([0, 5e6, 10e6, 15e6, 20e6, 25e6]);
    expect(valueTicks(1_159_274)).toEqual([0, 250_000, 500_000, 750_000, 1_000_000, 1_250_000]);
    expect(valueTicks(5000)).toEqual([0, 1000, 2000, 3000, 4000, 5000]);
    expect(valueTicks(0)).toEqual([0, 1]);
  });

  it('shortens axis amounts', () => {
    expect(fmtCompact(0)).toBe('0');
    expect(fmtCompact(950)).toBe('950');
    expect(fmtCompact(12_000)).toBe('12k');
    expect(fmtCompact(1_500_000)).toBe('1.5M');
    expect(fmtCompact(1_250_000)).toBe('1.25M');
    expect(fmtCompact(2e9)).toBe('2B');
  });
});

describe('describeGoalChart', () => {
  it('summarises years, amount invested and final values, and the target when given', () => {
    const pts = goalChartPoints(plan, returns);
    const text = describeGoalChart(pts, 'THB', 6000);
    expect(text).toMatch(/^Goal growth over 3 years\. Amount invested 4,600 THB; expected final value [\d,]+ THB \(low [\d,]+ THB, high [\d,]+ THB\)\. Target 6,000 THB\.$/);
    expect(describeGoalChart(pts, 'THB')).not.toContain('Target');
    expect(describeGoalChart([], 'THB')).toBe('Goal growth chart: no data.');
  });
});
