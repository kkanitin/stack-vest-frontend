import {
  goalSeries,
  projectGoal,
  projectRange,
  requiredMonthlyAmount,
  requiredMonthlyRange,
  returnRange,
  toTodaysMoney,
} from './goalMath';

/** The closed form from the ticket, for checking the simulation against. */
function closedForm(pv: number, pmt: number, years: number, annualPct: number): number {
  const r = annualPct / 100 / 12;
  const n = years * 12;
  if (r === 0) return pv + pmt * n;
  const g = (1 + r) ** n;
  return pv * g + (pmt * (g - 1)) / r;
}

describe('projectGoal', () => {
  it('matches the epic example: 10k/month at 8% for 30 years ≈ 14.9M', () => {
    const r = projectGoal({ startingAmount: 0, monthlyAmount: 10_000, years: 30, annualReturnPct: 8 });
    expect(r.finalValue).toBeCloseTo(14_903_594, -1);
    expect(r.totalInvested).toBe(3_600_000);
    expect(r.gain).toBeCloseTo(r.finalValue - 3_600_000, 6);
  });

  it('agrees with the closed form, starting amount included', () => {
    const cases: [number, number, number, number][] = [
      [50_000, 2_000, 10, 6],
      [1_000, 0, 5, 12],
      [0, 500, 20, -3],
    ];
    for (const [pv, pmt, years, pct] of cases) {
      const r = projectGoal({ startingAmount: pv, monthlyAmount: pmt, years, annualReturnPct: pct });
      expect(r.finalValue).toBeCloseTo(closedForm(pv, pmt, years, pct), 4);
    }
  });

  it('handles a 0% return without dividing by zero', () => {
    const r = projectGoal({ startingAmount: 1_000, monthlyAmount: 100, years: 2, annualReturnPct: 0 });
    expect(r.finalValue).toBe(3_400);
    expect(r.gain).toBe(0);
  });

  it('loses money at a negative return', () => {
    const r = projectGoal({ startingAmount: 10_000, monthlyAmount: 0, years: 1, annualReturnPct: -12 });
    expect(r.finalValue).toBeCloseTo(10_000 * 0.99 ** 12, 6);
    expect(r.gain).toBeLessThan(0);
  });

  it('raises the monthly amount each year by the contribution growth', () => {
    const r = projectGoal({
      startingAmount: 0, monthlyAmount: 100, years: 2, annualReturnPct: 0, contributionGrowthPct: 10,
    });
    // 12 × 100 + 12 × 110
    expect(r.totalInvested).toBeCloseTo(2_520, 6);
    expect(r.finalValue).toBeCloseTo(2_520, 6);
  });

  it('returns the starting amount for a zero-length plan', () => {
    const r = projectGoal({ startingAmount: 5_000, monthlyAmount: 100, years: 0, annualReturnPct: 8 });
    expect(r).toEqual({ finalValue: 5_000, totalInvested: 5_000, gain: 0 });
  });
});

describe('requiredMonthlyAmount', () => {
  it('matches the epic example: 1M in 3 years ≈ 24.7k/month at 8%', () => {
    const m = requiredMonthlyAmount({ startingAmount: 0, targetAmount: 1_000_000, years: 3, annualReturnPct: 8 });
    expect(m).toBeCloseTo(24_670, -1);
  });

  it('matches the epic example: 1M in 3 years ≈ 27.8k/month at 0%', () => {
    const m = requiredMonthlyAmount({ startingAmount: 0, targetAmount: 1_000_000, years: 3, annualReturnPct: 0 });
    expect(m).toBeCloseTo(1_000_000 / 36, 6);
  });

  it('round-trips with projectGoal, with a starting amount and contribution growth', () => {
    const inputs = { startingAmount: 20_000, years: 15, annualReturnPct: 7, contributionGrowthPct: 3 };
    const m = requiredMonthlyAmount({ ...inputs, targetAmount: 750_000 })!;
    expect(projectGoal({ ...inputs, monthlyAmount: m }).finalValue).toBeCloseTo(750_000, 4);
  });

  it('works at a negative return', () => {
    const inputs = { startingAmount: 0, years: 5, annualReturnPct: -4 };
    const m = requiredMonthlyAmount({ ...inputs, targetAmount: 100_000 })!;
    expect(m).toBeGreaterThan(100_000 / 60);
    expect(projectGoal({ ...inputs, monthlyAmount: m }).finalValue).toBeCloseTo(100_000, 4);
  });

  it('returns 0 when the starting amount already covers the target', () => {
    expect(requiredMonthlyAmount({ startingAmount: 1_000_000, targetAmount: 1_000_000, years: 3, annualReturnPct: 0 })).toBe(0);
    expect(requiredMonthlyAmount({ startingAmount: 900_000, targetAmount: 1_000_000, years: 3, annualReturnPct: 8 })).toBe(0);
  });

  it('returns null when there is no time to save', () => {
    expect(requiredMonthlyAmount({ startingAmount: 0, targetAmount: 1_000, years: 0, annualReturnPct: 8 })).toBeNull();
  });
});

describe('toTodaysMoney', () => {
  it('matches the epic example: 14.9M in 30 years at 3% inflation ≈ 6.1M', () => {
    const fv = projectGoal({ startingAmount: 0, monthlyAmount: 10_000, years: 30, annualReturnPct: 8 }).finalValue;
    expect(toTodaysMoney(fv, 30, 3)).toBeCloseTo(6_140_084, -1);
  });

  it('leaves the amount alone at 0% inflation or 0 years', () => {
    expect(toTodaysMoney(1_000, 10, 0)).toBe(1_000);
    expect(toTodaysMoney(1_000, 0, 3)).toBe(1_000);
  });
});

describe('ranges', () => {
  it('spreads the return 2 points either side by default', () => {
    expect(returnRange(8)).toEqual({ low: 6, expected: 8, high: 10 });
    expect(returnRange(1, 3)).toEqual({ low: -2, expected: 1, high: 4 });
  });

  it('projects low < expected < high', () => {
    const r = projectRange({ startingAmount: 0, monthlyAmount: 10_000, years: 30, annualReturnPct: 8 });
    expect(r.expected.finalValue).toBeCloseTo(14_903_594, -1);
    expect(r.low.finalValue).toBeLessThan(r.expected.finalValue);
    expect(r.high.finalValue).toBeGreaterThan(r.expected.finalValue);
  });

  it('needs the most each month at the low return', () => {
    const r = requiredMonthlyRange({ startingAmount: 0, targetAmount: 1_000_000, years: 3, annualReturnPct: 8 });
    expect(r.low!).toBeGreaterThan(r.expected!);
    expect(r.expected!).toBeGreaterThan(r.high!);
  });
});

describe('goalSeries', () => {
  it('has one point per year from year 0, ending at the projected value', () => {
    const inputs = { startingAmount: 1_000, monthlyAmount: 100, years: 3, annualReturnPct: 6 };
    const s = goalSeries(inputs);
    expect(s.map(p => p.year)).toEqual([0, 1, 2, 3]);
    expect(s[0]).toEqual({ year: 0, invested: 1_000, value: 1_000 });
    expect(s[1].invested).toBe(2_200);
    const end = projectGoal(inputs);
    expect(s[3].value).toBeCloseTo(end.finalValue, 6);
    expect(s[3].invested).toBe(end.totalInvested);
  });

  it('adds a final point for a part year', () => {
    const s = goalSeries({ startingAmount: 0, monthlyAmount: 100, years: 1.5, annualReturnPct: 0 });
    expect(s.map(p => p.year)).toEqual([0, 1, 1.5]);
    expect(s[2].value).toBe(1_800);
  });
});
