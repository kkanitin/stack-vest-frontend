import React from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { useElementSize } from '../hooks/useElementSize';
import DcaGrowthChart from './DcaGrowthChart';
import DcaSkippedNotice from './DcaSkippedNotice';
import { changeTone, fmtMoney, fmtPct } from '../utils/format';
import type { DcaHoldingsSimulation } from '../api/simulations';
import type { ChartPoint } from '../utils/dcaChart';

function Kpi({ label, value, tone, note }: { label: string; value: string; tone?: string; note?: string }) {
  return (
    <div className="dca-kpi">
      <div className="dca-kpi-label">{label}</div>
      <div className={`dca-kpi-value ${tone ?? ''}`}>{value}</div>
      {note && <div className="dca-kpi-note">{note}</div>}
    </div>
  );
}

/** The plan run across a portfolio's holdings: hypothetical notice, combined figures and chart, per-asset table. */
const DcaHoldingsResult: React.FC<{ simulation: DcaHoldingsSimulation }> = ({ simulation }) => {
  const [wrapRef, size] = useElementSize<HTMLDivElement>({ initialWidth: 760, initialHeight: 260 });
  const { combined, assets, skipped } = simulation;

  if (!combined) {
    return (
      <>
        <DcaSkippedNotice skipped={skipped} />
        <Card className="dca-chart-card px-6">
          <p className="dca-basis-note">None of this portfolio&apos;s holdings has enough price history for this plan.</p>
        </Card>
      </>
    );
  }

  const points: ChartPoint[] = combined.dataPoints.map(dp => ({
    date: dp.date,
    invested: dp.totalInvested,
    value: dp.portfolioValue,
  }));

  return (
    <>
      <div className="dca-hypothetical" role="note">
        <strong>Hypothetical.</strong> Every purchase is split across the portfolio&apos;s current assets at today&apos;s weights.
        This is not what you actually bought. Today&apos;s weights favour assets that have already done well, so the result
        flatters the portfolio.
      </div>

      <DcaSkippedNotice skipped={skipped} />

      <div className="dca-kpis dca-kpis--three">
        <Kpi label="Total Invested" value={fmtMoney(combined.totalInvested)} />
        <Kpi label="Current Value" value={fmtMoney(combined.finalPortfolioValue)} />
        <Kpi label="ROI" value={fmtPct(combined.totalReturnPct)} tone={changeTone(combined.totalReturnPct)} />
      </div>
      <div className="dca-kpis dca-kpis--returns">
        <Kpi
          label="Yearly Return (simple)"
          value={fmtPct(combined.annualizedReturnPct)}
          tone={changeTone(combined.annualizedReturnPct)}
          note={combined.annualizedReturnNote}
        />
        <Kpi
          label="Yearly Return (money-weighted)"
          value={combined.moneyWeightedReturnPct === null ? 'n/a' : fmtPct(combined.moneyWeightedReturnPct)}
          tone={changeTone(combined.moneyWeightedReturnPct)}
          note={combined.moneyWeightedReturnNote}
        />
      </div>
      <p className="dca-basis-note">{combined.priceBasisNote}</p>

      <Card className="dca-chart-card px-6">
        <CardTitle className="label-caps">Portfolio Growth</CardTitle>
        <div className="dca-chart-wrap" ref={wrapRef}>
          <DcaGrowthChart points={points} width={size.width} height={size.height} />
        </div>
        <div className="dca-chart-legend">
          <span className="dca-legend-item">
            <span className="dca-legend-swatch" style={{ background: 'var(--primary)' }} />
            Portfolio Value
          </span>
          <span className="dca-legend-item">
            <span className="dca-legend-swatch dca-legend-swatch--dashed" />
            Invested
          </span>
        </div>
      </Card>

      <Card className="dca-table-card px-6">
        <CardTitle className="label-caps">By Asset</CardTitle>
        <div className="dca-table-scroll">
          <table className="dca-table">
            <thead>
              <tr>
                <th scope="col">Asset</th>
                <th scope="col">Weight</th>
                <th scope="col">Invested</th>
                <th scope="col">Final Value</th>
                <th scope="col">Return</th>
              </tr>
            </thead>
            <tbody>
              {assets.map(a => (
                <tr key={a.symbol}>
                  <th scope="row">{a.symbol}</th>
                  <td>{a.weightPct.toFixed(1)}%</td>
                  <td>{fmtMoney(a.result.totalInvested)}</td>
                  <td>{fmtMoney(a.result.finalPortfolioValue)}</td>
                  <td className={changeTone(a.result.totalReturnPct)}>{fmtPct(a.result.totalReturnPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
};

export default DcaHoldingsResult;
