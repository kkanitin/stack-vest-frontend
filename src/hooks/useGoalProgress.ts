import type { Goal } from '../api/goals';
import { fxCurrencyCode } from '../api/fx';
import { portfolioCurrency } from '../api/portfolios';
import { goalPlanToDate, goalProgress, type GoalProgressState } from '../domain/goal/progress';
import { useFxRate } from './useFxRate';
import { usePortfolio } from './usePortfolio';
import { usePortfolios } from './usePortfolios';

/**
 * Progress of a saved goal against its linked portfolio (KAN-28), shared by the goal card
 * and the goal page. One `usePortfolios` call is shared by every caller; the portfolio detail
 * query is used only when the list carries no `value`; FX is one query per currency pair.
 * Values follow transactions through the existing `['portfolios']` / `['portfolio', id]`
 * invalidation; nothing polls.
 */
export function useGoalProgress(goal: Goal | undefined, today: Date = new Date()): GoalProgressState {
  const portfolios = usePortfolios();
  const portfolioId = goal?.portfolioId ?? undefined;
  const portfolio = portfolioId ? portfolios.data?.find(p => p.id === portfolioId) : undefined;

  // Without a plan there is nothing to compare with, so no value or rate is asked for.
  const plan = goal ? goalPlanToDate(goal, today) : null;

  const listValue = portfolio?.value;
  const needsDetail = !!plan && !!portfolio && (listValue == null || !Number.isFinite(listValue));
  const detail = usePortfolio(needsDetail ? portfolioId : undefined);
  const detailValue = needsDetail && !detail.isPlaceholderData ? detail.data?.value : undefined;
  const value = needsDetail ? detailValue : listValue;

  const from = portfolio ? portfolioCurrency(portfolio) : null;
  const to = goal ? fxCurrencyCode(goal.currency) : null;
  const askRate = !!plan && value != null;
  const fxRate = useFxRate(askRate ? from : null, askRate ? to : null);

  if (!goal || !portfolioId) return { state: 'not-linked' };
  if (portfolios.isPending) return { state: 'loading' };
  if (!portfolios.data) return { state: 'no-value', retry: () => void portfolios.refetch() };
  if (!portfolio) return { state: 'portfolio-removed' };

  if (!plan) return { state: 'unreachable' };

  if (value == null || !Number.isFinite(value)) {
    if (needsDetail && (detail.isPending || detail.isPlaceholderData)) return { state: 'loading' };
    if (needsDetail && detail.isError) return { state: 'no-value', retry: () => void detail.refetch() };
    return { state: 'no-value' };
  }

  const currency = goal.currency.trim();
  if (!to) return { state: 'fx-unavailable', reason: 'unsupported', from: from!, to: currency };
  if (fxRate.isLoading) return { state: 'loading' };
  if (!fxRate.fx) {
    return { state: 'fx-unavailable', reason: 'error', from: from!, to, retry: fxRate.refetch };
  }

  const actual = value * fxRate.fx.rate;
  const progress = goalProgress(actual, plan.planValue, goal.kind === 'target' ? goal.targetAmount : null);
  if (!progress) return { state: 'no-value' };

  return {
    state: 'ready',
    ...progress,
    actual,
    portfolioValue: value,
    portfolioCurrency: from!,
    portfolio,
    fx: from === to ? null : fxRate.fx,
    plan,
  };
}
