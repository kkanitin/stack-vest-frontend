import React from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { useElementSize } from '../hooks/useElementSize';
import DcaCompareChart from './DcaCompareChart';
import DcaSkippedNotice from './DcaSkippedNotice';
import { toSeries } from '../utils/dcaCompare';
import type { DcaComparison as Comparison } from '../api/simulations';

function money(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function pct(n: number | null): string {
  return n === null ? 'n/a' : `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function tone(n: number | null): string {
  return n === null ? '' : n >= 0 ? 'positive' : 'negative';
}

/** Several assets under one plan: skipped notice, percentage-return chart with legend, and a table. */
const DcaComparison: React.FC<{ comparison: Comparison }> = ({ comparison }) => {
  const [wrapRef, size] = useElementSize<HTMLDivElement>({ initialWidth: 760, initialHeight: 260 });
  const { results, skipped } = comparison;
  const series = toSeries(results);
  const plan = results[0];

  return (
    <>
      <DcaSkippedNotice skipped={skipped} />

      {results.length === 0 ? (
        <Card className="dca-chart-card px-6">
          <p className="dca-basis-note">None of the selected assets has enough price history for this plan.</p>
        </Card>
      ) : (
        <>
          <Card className="dca-chart-card px-6">
            <CardTitle className="label-caps">Return Comparison</CardTitle>
            <div className="dca-chart-wrap" ref={wrapRef}>
              <DcaCompareChart series={series} width={size.width} height={size.height} />
            </div>
            <div className="dca-chart-legend">
              {series.map(s => (
                <span key={s.symbol} className="dca-legend-item">
                  <span className="dca-legend-swatch" style={{ background: s.color }} />
                  {s.symbol}
                </span>
              ))}
            </div>
          </Card>

          <Card className="dca-table-card px-6">
            <CardTitle className="label-caps">Comparison</CardTitle>
            <div className="dca-table-scroll">
              <table className="dca-table">
                <thead>
                  <tr>
                    <th scope="col">Asset</th>
                    <th scope="col">Invested</th>
                    <th scope="col">Final Value</th>
                    <th scope="col">Return</th>
                    <th scope="col">Yearly (simple)</th>
                    <th scope="col">Yearly (money-weighted)</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={r.symbol}>
                      <th scope="row">
                        <span className="dca-legend-swatch" style={{ background: series[i].color }} /> {r.symbol}
                      </th>
                      <td>{money(r.totalInvested)}</td>
                      <td>{money(r.finalPortfolioValue)}</td>
                      <td className={tone(r.totalReturnPct)}>{pct(r.totalReturnPct)}</td>
                      <td className={tone(r.annualizedReturnPct)}>{pct(r.annualizedReturnPct)}</td>
                      <td className={tone(r.moneyWeightedReturnPct)}>{pct(r.moneyWeightedReturnPct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="dca-basis-note">
              Every asset uses the same plan: {money(plan.amountPerPeriod)} {plan.frequency} from {plan.startDate} to {plan.endDate}.{' '}
              {plan.priceBasisNote}
            </p>
          </Card>
        </>
      )}
    </>
  );
};

export default DcaComparison;
