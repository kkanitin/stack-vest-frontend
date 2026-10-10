import React, { useEffect, useMemo, useState } from 'react';
import { usePortfolios } from '../hooks/usePortfolios';
import { usePortfolioPositionsById } from '../hooks/usePortfolioPositionsById';
import { mergeHoldings } from '../utils/holdings';
import type { DcaHolding } from '../api/simulations';

interface Props {
  /** Called with the chosen portfolio's priced holdings (current weights), or null while unknown. */
  onChange: (holdings: DcaHolding[] | null) => void;
}

/**
 * Picks one of the user's portfolios and reports its holdings at their current weights.
 * Weights are rounded to two decimals so the minute-by-minute price refresh does not
 * change them (and re-run the simulation) unless an allocation really moved.
 */
const HoldingsPicker: React.FC<Props> = ({ onChange }) => {
  const portfolios = usePortfolios();
  const [chosen, setChosen] = useState<string | undefined>();
  const portfolioId = chosen ?? portfolios.data?.[0]?.id;
  const positions = usePortfolioPositionsById(portfolioId);

  const { holdings, unpriced } = useMemo(() => {
    const merged = mergeHoldings((positions.data ?? []).filter(p => !p.closed));
    const priced: DcaHolding[] = [];
    const missing: string[] = [];
    for (const h of merged) {
      const weight = Math.round(h.weight * 100) / 100;
      if (weight > 0) priced.push({ symbol: h.symbol, weight });
      else missing.push(h.symbol);
    }
    return { holdings: priced, unpriced: missing };
  }, [positions.data]);

  const ready = portfolioId !== undefined && positions.data !== undefined;
  const key = ready ? JSON.stringify(holdings) : null;
  useEffect(() => {
    onChange(key === null ? null : (JSON.parse(key) as DcaHolding[]));
  }, [key, onChange]);

  if (portfolios.isLoading) return <p className="dca-basis-note">Loading your portfolios…</p>;
  if (portfolios.isError) return <p className="dca-field-error" role="alert">Could not load your portfolios.</p>;
  if (!portfolios.data || portfolios.data.length === 0) {
    return <p className="dca-basis-note">You have no portfolios yet. Create one on the Portfolios page to simulate your holdings.</p>;
  }

  return (
    <div className="dca-field">
      <label className="dca-label" htmlFor="dca-portfolio">Portfolio</label>
      <select
        id="dca-portfolio"
        className="dca-select"
        value={portfolioId}
        onChange={e => setChosen(e.target.value)}
      >
        {portfolios.data.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

      {positions.isLoading && <p className="dca-basis-note">Loading holdings…</p>}
      {positions.isError && <p className="dca-field-error" role="alert">Could not load this portfolio's holdings.</p>}
      {ready && holdings.length === 0 && (
        <p className="dca-basis-note" role="status">
          {unpriced.length > 0
            ? 'None of this portfolio\'s holdings has a price yet, so there is nothing to weight. Try again shortly.'
            : 'This portfolio has no holdings yet. Add positions to it to simulate them.'}
        </p>
      )}
      {ready && holdings.length > 0 && (
        <p className="dca-basis-note">
          {holdings.length} {holdings.length === 1 ? 'holding' : 'holdings'} at today&apos;s weights
          {unpriced.length > 0 ? `; ${unpriced.join(', ')} left out (no price)` : ''}.
        </p>
      )}
    </div>
  );
};

export default HoldingsPicker;
