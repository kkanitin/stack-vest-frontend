import { fmtAmount, fmtRate } from './format';
import type { GoalSimulationResult, GoalResult } from './goalResult';

/** Below this the chance is shown as "Less than 5%", above 1 − this as "Over 95%". */
export const CHANCE_CLAMP = 0.05;

/**
 * A chance (0–1) for people: rounded to the nearest 5% so it does not sound more precise
 * than it is, with the ends clamped. "About 70%", "Less than 5%", "Over 95%".
 */
export function fmtChance(p: number): string {
  if (p < CHANCE_CLAMP) return 'Less than 5%';
  if (p > 1 - CHANCE_CLAMP) return 'Over 95%';
  return `About ${Math.round(p * 20) * 5}%`;
}

/**
 * The headline sentence for the simulation (KAN-35):
 * - target: "About 70% chance of reaching 1,000,000 THB if you invest 12,400 THB a month."
 * - projection: "In 8 of 10 simulated outcomes you end with between 900,000 THB and 2,100,000 THB."
 */
export function describeChance(result: GoalResult, sim: GoalSimulationResult): string {
  const amount = (n: number) => fmtAmount(n, result.currency);
  if (result.kind === 'target' && sim.probability != null && result.headline != null) {
    const target = `${amount(result.targetAmount)}${result.todaysMoney ? " in today's money" : ''}`;
    const how = result.headline === 0
      ? 'with your starting amount alone'
      : `if you invest ${amount(result.headline)} a month`;
    return `${fmtChance(sim.probability)} chance of reaching ${target} ${how}.`;
  }
  const inside = Math.round((sim.percentiles.high - sim.percentiles.low) / 10);
  return `In ${inside} of 10 simulated outcomes you end with between ${amount(sim.final.low)} and ${amount(sim.final.high)}.`;
}

/** The note under the chance: where it comes from and what it is not. */
export function chanceNote(sim: GoalSimulationResult): string {
  return (
    `Simulated from ${sim.paths.toLocaleString('en-US')} possible paths at the expected return and ` +
    `±${fmtRate(sim.volatilityPct)} volatility a year. A suggested volatility comes from past price moves ` +
    'only (dividends not included). This is an estimate, not a promise: real returns can land outside it.'
  );
}

/** Why there is no chance shown: the volatility field is empty. */
export function noChanceText(kind: GoalResult['kind']): string {
  return kind === 'target'
    ? 'Add a volatility a year to see the chance of reaching your target.'
    : 'Add a volatility a year to see the range of likely outcomes.';
}
