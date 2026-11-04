import React from 'react';
import { usePortfolios } from '../hooks/usePortfolios';
import type { SuggestedReturn } from '../api/portfolios';
import { describeSuggestion, isSuggestedRate, suggestedRate } from '../utils/suggestedReturn';
import DcaSkippedNotice from './DcaSkippedNotice';
import './GoalPortfolioLink.css';

/** The slice of the suggested-return query this component reads. */
export interface SuggestionState {
  data: SuggestedReturn | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => unknown;
}

interface Props {
  /** '' when no portfolio is linked. */
  portfolioId: string;
  onPortfolioChange: (id: string) => void;
  suggestion: SuggestionState;
  /** The expected-return field as typed, to tell whether it already holds the suggestion. */
  expectedReturnText: string;
  onUseSuggested: (rate: number) => void;
  /**
   * The linked portfolio no longer exists (a saved goal whose portfolio was deleted). The
   * picker shows it as removed and no suggestion is asked for.
   */
  linkRemoved?: boolean;
}

/**
 * "Link to a portfolio" picker for the goal calculator, with the suggested return for the
 * linked portfolio. Loading and error states are notes only: the rest of the form stays usable.
 */
const GoalPortfolioLink: React.FC<Props> = ({
  portfolioId,
  onPortfolioChange,
  suggestion,
  expectedReturnText,
  onUseSuggested,
  linkRemoved = false,
}) => {
  const portfolios = usePortfolios();
  const list = portfolios.data ?? [];
  const linked = portfolioId !== '';
  const data = linked ? suggestion.data : undefined;
  const rate = suggestedRate(data);
  const description = data ? describeSuggestion(data) : null;

  let pickerHint: string | null = null;
  if (portfolios.isLoading) pickerHint = 'Loading your portfolios…';
  else if (portfolios.isError) pickerHint = 'Could not load your portfolios. You can still enter the expected return yourself.';
  else if (linkRemoved) pickerHint = null;
  else if (portfolios.data && list.length === 0) pickerHint = 'You have no portfolios yet.';
  else if (!linked) pickerHint = 'Optional. Link one to get a suggested return from what it holds.';

  return (
    <div className="goal-field goal-link" data-testid="goal-portfolio-link">
      <label className="goal-label" htmlFor="goal-portfolio">Link to a portfolio</label>
      <select
        id="goal-portfolio"
        className="goal-input goal-select"
        value={portfolioId}
        onChange={e => onPortfolioChange(e.target.value)}
        aria-describedby="goal-portfolio-hint"
      >
        <option value="">No portfolio</option>
        {linkRemoved && <option value={portfolioId} disabled>Removed portfolio</option>}
        {list.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

      <div id="goal-portfolio-hint" className="goal-link-status" aria-live="polite">
        {pickerHint && <p className="goal-hint">{pickerHint}</p>}

        {linkRemoved && (
          <p className="goal-hint goal-link-removed" role="status" data-testid="goal-link-removed">
            The portfolio this goal was linked to has been deleted. Pick another one or leave it
            unlinked; saving removes the old link.
          </p>
        )}

        {linked && suggestion.isLoading && (
          <p className="goal-hint" role="status">Working out a suggested return…</p>
        )}

        {linked && suggestion.isError && (
          <p className="goal-hint goal-link-error" role="alert">
            Could not get a suggested return. Enter the expected return yourself, or{' '}
            <button type="button" className="goal-link-button" onClick={() => suggestion.refetch()}>try again</button>.
          </p>
        )}

        {data && rate == null && (
          <div className="goal-hint" role="status">
            <strong className="goal-link-none">No suggestion for this portfolio.</strong>
            {data.note && <> {data.note}</>} Enter the expected return yourself.
          </div>
        )}

        {data && rate != null && (
          <div className="goal-link-suggestion" role="status">
            <p className="goal-hint" data-testid="goal-suggestion">{description}</p>
            {!isSuggestedRate(expectedReturnText, rate) && (
              <button type="button" className="goal-link-use" onClick={() => onUseSuggested(rate)}>
                Use suggested
              </button>
            )}
          </div>
        )}

        {data && data.available && data.note && <p className="goal-hint">{data.note}</p>}

        {data && (
          <DcaSkippedNotice skipped={data.skipped} title="Left out of the suggestion:" />
        )}
      </div>
    </div>
  );
};

export default GoalPortfolioLink;
