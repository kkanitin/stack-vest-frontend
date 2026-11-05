import { goalSeries, projectGoal, type ProjectionInputs } from './goalMath';
import {
  inverseNormalCdf,
  percentileOfSorted,
  simulateGoalPaths,
  SIMULATION_PATHS,
  SIMULATION_PERCENTILES,
} from './goalMonteCarlo';

const plan: ProjectionInputs = {
  startingAmount: 10_000,
  monthlyAmount: 1_000,
  years: 20,
  annualReturnPct: 7,
};

const simulate = (inputs: ProjectionInputs, annualVolatilityPct: number, seed?: number) =>
  simulateGoalPaths(inputs, { annualReturnPct: inputs.annualReturnPct, annualVolatilityPct, seed });

describe('inverseNormalCdf', () => {
  it('gives the familiar quantiles', () => {
    expect(inverseNormalCdf(0.5)).toBeCloseTo(0, 9);
    expect(inverseNormalCdf(0.975)).toBeCloseTo(1.959964, 5);
    expect(inverseNormalCdf(0.1)).toBeCloseTo(-1.281552, 5);
    expect(inverseNormalCdf(0.001)).toBeCloseTo(-3.090232, 5);
  });
});

describe('percentileOfSorted', () => {
  it('interpolates between ranks', () => {
    expect(percentileOfSorted([1, 2, 3, 4, 5], 50)).toBe(3);
    expect(percentileOfSorted([0, 10], 25)).toBe(2.5);
    expect(percentileOfSorted([7], 90)).toBe(7);
  });
});

describe('simulateGoalPaths', () => {
  it('uses 2,000 paths and the 10th / 50th / 90th percentiles by default', () => {
    const sim = simulate(plan, 15);
    expect(sim.paths).toBe(SIMULATION_PATHS);
    expect(sim.percentiles).toEqual({ low: 10, expected: 50, high: 90 });
    expect(SIMULATION_PERCENTILES).toEqual(sim.percentiles);
  });

  it('with volatility 0, every path is the deterministic plan', () => {
    const sim = simulate(plan, 0);
    const series = goalSeries(plan);
    expect(sim.series.map(p => p.year)).toEqual(series.map(p => p.year));
    sim.series.forEach((p, i) => {
      expect(p.invested).toBe(series[i].invested);
      expect(p.value.low).toBe(series[i].value);
      expect(p.value.expected).toBe(series[i].value);
      expect(p.value.high).toBe(series[i].value);
    });
    const { finalValue } = projectGoal(plan);
    expect(sim.final).toEqual({ low: finalValue, expected: finalValue, high: finalValue });
    expect(sim.probabilityOfReaching(finalValue)).toBe(1);
    expect(sim.probabilityOfReaching(finalValue + 1)).toBe(0);
  });

  it('gives the same output for the same seed, and different output for another', () => {
    const a = simulate(plan, 15);
    const b = simulate(plan, 15);
    expect(a.series).toEqual(b.series);
    expect(a.final).toEqual(b.final);
    const c = simulate(plan, 15, 42);
    expect(c.final.expected).not.toBe(a.final.expected);
  });

  it('keeps the median close to the deterministic plan', () => {
    // With monthly amounts the median sits a little above the plan (a sum of lognormal
    // amounts is right-skewed): about 1% at 10% volatility and 4% at 20% over 20 years.
    const deterministic = projectGoal(plan).finalValue;
    for (const [volatility, tolerance] of [[10, 0.03], [20, 0.06]]) {
      const ratio = simulate(plan, volatility).final.expected / deterministic;
      expect(ratio).toBeGreaterThan(1 - tolerance);
      expect(ratio).toBeLessThan(1 + tolerance);
    }
    // With no monthly amounts the median of the growth is exactly the plan, up to sampling noise.
    const lump = { ...plan, monthlyAmount: 0 };
    // 20,000 paths keep the median's sampling error (about 2.5% at 2,000 paths here) small.
    const sim = simulateGoalPaths(lump, { annualReturnPct: 7, annualVolatilityPct: 20, paths: 20_000 });
    expect(Math.abs(sim.final.expected / projectGoal(lump).finalValue - 1)).toBeLessThan(0.02);
  });

  it('orders the percentiles and widens the band over time', () => {
    const sim = simulate(plan, 15);
    for (const p of sim.series.slice(1)) {
      expect(p.value.low).toBeLessThan(p.value.expected);
      expect(p.value.expected).toBeLessThan(p.value.high);
    }
    const width = (i: number) => sim.series[i].value.high - sim.series[i].value.low;
    expect(width(20)).toBeGreaterThan(width(10));
    expect(width(10)).toBeGreaterThan(width(1));
  });

  it('lowers the probability as the target rises', () => {
    const sim = simulate(plan, 15);
    const median = sim.final.expected;
    const probs = [0.5, 0.8, 1, 1.2, 1.5].map(k => sim.probabilityOfReaching(median * k));
    for (let i = 1; i < probs.length; i++) expect(probs[i]).toBeLessThanOrEqual(probs[i - 1]);
    expect(probs[0]).toBeGreaterThan(0.9);
    expect(probs[2]).toBeCloseTo(0.5, 1);
    expect(probs[4]).toBeLessThan(0.2);
  });

  it('lowers the probability as volatility rises when the target is below the median', () => {
    // Above the median it is the other way round: a wider spread reaches a high target more often.
    const above = projectGoal(plan).finalValue * 1.3;
    const probsAbove = [5, 10, 20].map(v => simulate(plan, v).probabilityOfReaching(above));
    for (let i = 1; i < probsAbove.length; i++) expect(probsAbove[i]).toBeGreaterThan(probsAbove[i - 1]);

    const below = projectGoal(plan).finalValue * 0.7;
    const probsBelow = [5, 10, 20, 30].map(v => simulate(plan, v).probabilityOfReaching(below));
    for (let i = 1; i < probsBelow.length; i++) expect(probsBelow[i]).toBeLessThan(probsBelow[i - 1]);
  });

  it('adds a part-year point at the end, like goalSeries', () => {
    const part = { ...plan, years: 2.5 };
    const sim = simulate(part, 15);
    expect(sim.series.map(p => p.year)).toEqual([0, 1, 2, 2.5]);
    expect(sim.series[3].invested).toBe(projectGoal(part).totalInvested);
  });

  it('handles 0% and negative returns', () => {
    const zero = { ...plan, annualReturnPct: 0 };
    const zSim = simulate(zero, 0);
    expect(zSim.final.expected).toBeCloseTo(10_000 + 1_000 * 240, 6);

    const negative = { ...plan, annualReturnPct: -5 };
    const nSim = simulate(negative, 15);
    expect(nSim.final.expected).toBeLessThan(nSim.series.at(-1)!.invested);
    expect(Math.abs(nSim.final.expected / projectGoal(negative).finalValue - 1)).toBeLessThan(0.05);
  });

  it('applies the yearly increase in the monthly amount', () => {
    const rising = { ...plan, contributionGrowthPct: 5 };
    const sim = simulate(rising, 15);
    expect(sim.series.at(-1)!.invested).toBeCloseTo(projectGoal(rising).totalInvested, 6);
    expect(simulate(rising, 0).final.expected).toBe(projectGoal(rising).finalValue);
    expect(sim.final.expected).toBeGreaterThan(simulate(plan, 15).final.expected);
  });

  it('runs 100 years of 2,000 paths within a frame budget', () => {
    const long = { ...plan, years: 100 };
    simulate(long, 15); // warm up the JIT and the normal table
    const start = performance.now();
    simulate(long, 15);
    const ms = performance.now() - start;
    // About 10 ms on a laptop; the bound is loose so slow CI machines do not flake.
    expect(ms).toBeLessThan(100);
  });
});
