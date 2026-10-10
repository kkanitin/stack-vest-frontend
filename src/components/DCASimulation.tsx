import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { runDcaSimulation, compareDca, simulateDcaHoldings, DcaRequestError } from '../api/simulations';
import type {
  DcaResult,
  DcaFrequency,
  DcaHolding,
  DcaHoldingsSimulation,
  DcaComparison as DcaComparisonData,
} from '../api/simulations';
import type { LumpSumResult } from '../utils/dcaLumpSum';
import { defaultRange, validateInputs } from '../utils/dcaInputs';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useElementSize } from '../hooks/useElementSize';
import AssetPicker from './AssetPicker';
import DcaGrowthChart from './DcaGrowthChart';
import DcaComparison from './DcaComparison';
import DcaHoldingsResult from './DcaHoldingsResult';
import HoldingsPicker from './HoldingsPicker';
import type { ChartPoint } from '../utils/dcaChart';
import { computeLumpSum } from '../utils/dcaLumpSum';
import type { PickedAsset } from './AssetPicker';
import './DCASimulation.css';

type Frequency = DcaFrequency;
type Segment<T extends string> = { value: T; label: string };

const FREQ_SEGMENTS: Segment<Frequency>[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const DEFAULT_ASSET: PickedAsset = { symbol: 'AAPL', name: 'Apple Inc.' };

const SUGGESTIONS: PickedAsset[] = [
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF' },
  { symbol: 'AMZN', name: 'Amazon.com, Inc.' },
];

/** Most assets one comparison may hold, the primary asset included (mirrors the backend). */
const MAX_ASSETS = 3;

function fmtMoney(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtMoney2(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function YearlyReturn({ label, pct, note }: { label: string; pct: number | null; note: string }) {
  return (
    <div className="dca-kpi">
      <div className="dca-kpi-label">{label}</div>
      <div className={`dca-kpi-value ${pct === null ? '' : pct >= 0 ? 'positive' : 'negative'}`}>
        {pct === null ? 'n/a' : fmtPct(pct)}
      </div>
      <div className="dca-kpi-note">{note}</div>
    </div>
  );
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return <div id={id} className="dca-field-error" role="alert">{children}</div>;
}

function fmtSignedMoney(n: number): string {
  return `${n >= 0 ? '+' : '-'}${fmtMoney(Math.abs(n))}`;
}

function LumpSumPanel({ lump, dcaValue }: { lump: LumpSumResult; dcaValue: number }) {
  const verdict =
    lump.better === 'tie'
      ? 'Over this range, a lump sum and DCA ended in the same place.'
      : lump.better === 'lump'
        ? `Over this range, a lump sum did better than DCA by ${fmtMoney(Math.abs(lump.diff))}.`
        : `Over this range, DCA did better than a lump sum by ${fmtMoney(Math.abs(lump.diff))}.`;
  return (
    <>
      <div className="dca-kpis dca-kpis--three" data-testid="lump-sum-kpis">
        <div className="dca-kpi">
          <div className="dca-kpi-label">Lump Sum Value</div>
          <div className="dca-kpi-value">{fmtMoney(lump.finalValue)}</div>
          <div className="dca-kpi-note">DCA ended at {fmtMoney(dcaValue)}</div>
        </div>
        <div className="dca-kpi">
          <div className="dca-kpi-label">Lump Sum Return</div>
          <div className={`dca-kpi-value ${lump.returnPct >= 0 ? 'positive' : 'negative'}`}>{fmtPct(lump.returnPct)}</div>
        </div>
        <div className="dca-kpi">
          <div className="dca-kpi-label">Lump Sum vs DCA</div>
          <div className={`dca-kpi-value ${lump.diff >= 0 ? 'positive' : 'negative'}`}>{fmtSignedMoney(lump.diff)}</div>
          <div className="dca-kpi-note">{fmtPct(lump.diffPct)} of the amount invested</div>
        </div>
      </div>
      <p className="dca-verdict" role="status">{verdict}</p>
      <p className="dca-basis-note">
        Lump sum: the same total the DCA plan invested over the whole range, bought on the first purchase date at that
        day's price and valued at the same final price.
      </p>
    </>
  );
}

function KpiSkeleton() {
  return (
    <div className="dca-kpis">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="dca-kpi">
          <div className="dca-kpi-label dca-skeleton dca-skeleton--label">&nbsp;</div>
          <div className="dca-kpi-value dca-skeleton dca-skeleton--value">&nbsp;</div>
        </div>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return <div className="dca-chart-skeleton dca-skeleton" />;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

const DCASimulation: React.FC = () => {
  const { token } = useAuth();
  const [asset, setAsset] = useState<PickedAsset>(DEFAULT_ASSET);
  // Amount stays text so clearing the field is not coerced to 0 while the user is typing.
  const [amountText, setAmountText] = useState('100');
  const [freq, setFreq] = useState<Frequency>('weekly');
  const [compareLump, setCompareLump] = useState(false);
  // Extra assets to compare with the primary one; empty means the single-asset view.
  const [extras, setExtras] = useState<PickedAsset[]>([]);
  // 'assets' simulates (and compares) searched assets; 'holdings' runs the plan over one of the user's portfolios.
  const [mode, setMode] = useState<'assets' | 'holdings'>('assets');
  const holdingsMode = mode === 'holdings';
  const compareMode = !holdingsMode && extras.length > 0;
  const [holdingsList, setHoldingsList] = useState<DcaHolding[] | null>(null);
  const holdingsKey = JSON.stringify(holdingsList);
  const [start, setStart] = useState(() => defaultRange().start);
  const [end, setEnd] = useState(() => defaultRange().end);

  // Invalid inputs never reach the API and never raise the error banner; the last valid
  // result stays on screen until the inputs are valid again.
  const inputErrors = validateInputs({ amount: amountText, frequency: freq, start, end });
  const inputsValid = Object.keys(inputErrors).length === 0;

  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<DcaResult | null>(null);
  const [comparison, setComparison] = useState<DcaComparisonData | null>(null);
  const [holdingsSim, setHoldingsSim] = useState<DcaHoldingsSimulation | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Guard against stale responses from superseded requests.
  const reqIdRef = useRef(0);
  // Skip debounce on the very first effect run (mount).
  const isFirstRun = useRef(true);

  // Measures the chart wrapper's actual rendered box so the SVG viewBox can match it
  // exactly, avoiding the non-uniform stretch that squishes axis-label text.
  const [chartWrapRef, chartSize] = useElementSize<HTMLDivElement>({
    initialWidth: 760,
    initialHeight: 260,
  });

  const fetchSimulation = useCallback(async () => {
    if (!token || !inputsValid) return;
    if (holdingsMode && !holdingsList?.length) return; // nothing to simulate; the picker explains why
    const reqId = ++reqIdRef.current;
    setStatus('loading');
    setError(null);
    try {
      const plan = { startDate: start, endDate: end, amount: Number(amountText), frequency: freq };
      if (holdingsMode) {
        // One request however many holdings there are (up to the portfolio limit).
        const data = await simulateDcaHoldings(token, { ...plan, holdings: holdingsList! });
        if (reqId !== reqIdRef.current) return;
        setHoldingsSim(data);
      } else if (compareMode) {
        // One request for every asset, so three assets cost one call against the request limit.
        const data = await compareDca(token, { ...plan, symbols: [asset.symbol, ...extras.map(a => a.symbol)] });
        if (reqId !== reqIdRef.current) return;
        setComparison(data);
      } else {
        const data = await runDcaSimulation(token, { ...plan, symbol: asset.symbol });
        if (reqId !== reqIdRef.current) return;
        setResult(data);
      }
      setStatus('success');
    } catch (e) {
      if (reqId !== reqIdRef.current) return;
      setError(
        e instanceof DcaRequestError && e.status === 404
          ? `No price history found for ${asset.symbol} in this date range. Try a different asset or dates.`
          : e instanceof Error ? e.message : 'Simulation failed'
      );
      setStatus('error');
    }
    // holdingsKey stands in for holdingsList: it only changes when an allocation really does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, inputsValid, asset, extras, compareMode, holdingsMode, holdingsKey, start, end, amountText, freq]);

  // First run is immediate; subsequent input changes are debounced 300 ms.
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      fetchSimulation();
      return;
    }
    const t = setTimeout(fetchSimulation, 300);
    return () => clearTimeout(t);
  }, [fetchSimulation]);

  const isLoading = status === 'loading' || status === 'idle';
  const hasData = holdingsMode ? holdingsSim !== null : compareMode ? comparison !== null : result !== null;
  const showSkeleton = (isLoading || status === 'error' || holdingsMode || compareMode) && !hasData;

  const lump = compareLump && result ? computeLumpSum(result.dataPoints) : null;

  const chartPoints: ChartPoint[] = result?.dataPoints.map((dp, i) => ({
    date: dp.date,
    invested: dp.totalInvested,
    value: dp.portfolioValue,
    ...(lump ? { lump: lump.values[i] } : {}),
  })) ?? [];

  const avgBuyPrice = result && result.totalUnits > 0
    ? result.totalInvested / result.totalUnits
    : 0;

  // An asset can appear only once in a comparison.
  const taken = (symbol: string, exceptIndex: number) =>
    symbol === asset.symbol || extras.some((a, i) => i !== exceptIndex && a.symbol === symbol);
  const pickPrimary = (a: PickedAsset) => {
    if (!extras.some(x => x.symbol === a.symbol)) setAsset(a);
  };
  const pickExtra = (index: number, a: PickedAsset) => {
    if (!taken(a.symbol, index)) setExtras(list => list.map((x, i) => (i === index ? a : x)));
  };
  // A new slot starts on a popular asset not already chosen; the user then searches to replace it.
  const nextPlaceholder = (list: PickedAsset[]): PickedAsset =>
    SUGGESTIONS.find(s => s.symbol !== asset.symbol && !list.some(x => x.symbol === s.symbol)) ?? SUGGESTIONS[0];

  return (
    <div className="dca">
      <header className="dca-head">
        <div className="dca-head-text">
          <div className="dca-title-row">
            <h1 className="dca-title">DCA Simulation</h1>
          </div>
          <p className="dca-sub">Backtest dollar-cost averaging across any tracked asset.</p>
          <p className="dca-disclaimer">Past results do not predict future ones. This is a backtest, not investment advice.</p>
        </div>
      </header>

      {error && (
        <div className="dca-error-banner" role="alert">
          <span>{error}</span>
          <button
            className="dca-error-dismiss"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      <div className="dca-grid">
        <Card className="dca-form px-6">
          <CardTitle className="label-caps">Simulation Parameters</CardTitle>
          <ToggleGroup
            type="single"
            variant="outline"
            value={mode}
            onValueChange={v => v && setMode(v as 'assets' | 'holdings')}
            aria-label="What to simulate"
          >
            <ToggleGroupItem value="assets">Single asset</ToggleGroupItem>
            <ToggleGroupItem value="holdings">My holdings</ToggleGroupItem>
          </ToggleGroup>

          {holdingsMode && <HoldingsPicker onChange={setHoldingsList} />}

          {!holdingsMode && (
          <>
          <div className="dca-field">
            <label className="dca-label" htmlFor="dca-asset">Target Asset</label>
            <AssetPicker id="dca-asset" value={asset} onChange={pickPrimary} />
          </div>

          {extras.map((extra, i) => (
            <div className="dca-field" key={i}>
              <label className="dca-label" htmlFor={`dca-extra-${i}`}>Compare With</label>
              <div className="dca-extra">
                <AssetPicker id={`dca-extra-${i}`} value={extra} onChange={a => pickExtra(i, a)} />
                <button
                  type="button"
                  className="dca-extra-remove"
                  aria-label={`Remove ${extra.symbol}`}
                  onClick={() => setExtras(list => list.filter((_, j) => j !== i))}
                >
                  ×
                </button>
              </div>
            </div>
          ))}

          {extras.length + 1 < MAX_ASSETS ? (
            <button type="button" className="dca-add-asset" onClick={() => setExtras(list => [...list, nextPlaceholder(list)])}>
              + Add an asset to compare
            </button>
          ) : (
            <p className="dca-basis-note">You can compare up to {MAX_ASSETS} assets at a time. Remove one to add another.</p>
          )}
          </>
          )}

          <div className="dca-field">
            <label className="dca-label" htmlFor="dca-amount">Amount per Interval</label>
            <div className="dca-input-wrap">
              <span className="dca-input-prefix">$</span>
              <input
                id="dca-amount"
                className="dca-input dca-input--mono"
                type="number"
                min={1}
                value={amountText}
                onChange={e => setAmountText(e.target.value)}
                aria-invalid={!!inputErrors.amount}
                aria-describedby={inputErrors.amount ? 'dca-amount-err' : undefined}
              />
            </div>
            {inputErrors.amount && <FieldError id="dca-amount-err">{inputErrors.amount}</FieldError>}
          </div>

          <div className="dca-field">
            <label className="dca-label">Frequency</label>
            <ToggleGroup
              type="single"
              variant="outline"
              value={freq}
              onValueChange={(v) => v && setFreq(v as Frequency)}
            >
              {FREQ_SEGMENTS.map((s) => (
                <ToggleGroupItem key={s.value} value={s.value}>{s.label}</ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="dca-field-row">
            <div className="dca-field">
              <label className="dca-label" htmlFor="dca-start">Start Date</label>
              <input
                id="dca-start"
                className="dca-input dca-input--mono"
                type="date"
                value={start}
                onChange={e => setStart(e.target.value)}
                aria-invalid={!!inputErrors.start}
                aria-describedby={inputErrors.start ? 'dca-start-err' : undefined}
              />
              {inputErrors.start && <FieldError id="dca-start-err">{inputErrors.start}</FieldError>}
            </div>
            <div className="dca-field">
              <label className="dca-label" htmlFor="dca-end">End Date</label>
              <input
                id="dca-end"
                className="dca-input dca-input--mono"
                type="date"
                value={end}
                onChange={e => setEnd(e.target.value)}
                aria-invalid={!!inputErrors.end}
                aria-describedby={inputErrors.end ? 'dca-end-err' : undefined}
              />
              {inputErrors.end && <FieldError id="dca-end-err">{inputErrors.end}</FieldError>}
            </div>
          </div>

          {!compareMode && !holdingsMode && (
            <label className="dca-check">
              <input
                type="checkbox"
                checked={compareLump}
                onChange={e => setCompareLump(e.target.checked)}
              />
              Compare with a lump sum
            </label>
          )}

          <Button
            className="w-full dca-run"
            onClick={fetchSimulation}
            disabled={isLoading || !inputsValid}
          >
            {isLoading ? 'Running…' : 'Run Simulation'}
          </Button>
        </Card>

        <div className="dca-right">
          {holdingsMode ? (
            !holdingsList?.length ? null : showSkeleton ? (
              <>
                <KpiSkeleton />
                <Card className="dca-chart-card px-6"><ChartSkeleton /></Card>
              </>
            ) : (
              holdingsSim && <DcaHoldingsResult simulation={holdingsSim} />
            )
          ) : compareMode ? (
            showSkeleton ? (
              <>
                <KpiSkeleton />
                <Card className="dca-chart-card px-6"><ChartSkeleton /></Card>
              </>
            ) : (
              comparison && <DcaComparison comparison={comparison} />
            )
          ) : (
          <>
          {showSkeleton ? (
            <KpiSkeleton />
          ) : (
            <div className="dca-kpis">
              <div className="dca-kpi">
                <div className="dca-kpi-label">Total Invested</div>
                <div className="dca-kpi-value">{fmtMoney(result?.totalInvested ?? 0)}</div>
              </div>
              <div className="dca-kpi">
                <div className="dca-kpi-label">Current Value</div>
                <div className="dca-kpi-value">{fmtMoney(result?.finalPortfolioValue ?? 0)}</div>
              </div>
              <div className="dca-kpi">
                <div className="dca-kpi-label">ROI</div>
                <div className={`dca-kpi-value ${(result?.totalReturnPct ?? 0) >= 0 ? 'positive' : 'negative'}`}>
                  {fmtPct(result?.totalReturnPct ?? 0)}
                </div>
              </div>
              <div className="dca-kpi">
                <div className="dca-kpi-label">Avg Buy Price</div>
                <div className="dca-kpi-value">{fmtMoney2(avgBuyPrice)}</div>
              </div>
            </div>
          )}

          {!showSkeleton && result && (
            <>
              <div className="dca-kpis dca-kpis--returns">
                <YearlyReturn
                  label="Yearly Return (simple)"
                  pct={result.annualizedReturnPct}
                  note={result.annualizedReturnNote}
                />
                <YearlyReturn
                  label="Yearly Return (money-weighted)"
                  pct={result.moneyWeightedReturnPct}
                  note={result.moneyWeightedReturnNote}
                />
              </div>
              <p className="dca-basis-note">{result.priceBasisNote}</p>
              {lump && <LumpSumPanel lump={lump} dcaValue={result.finalPortfolioValue} />}
            </>
          )}

          <Card className="dca-chart-card px-6">
            <CardTitle className="label-caps">Portfolio Growth</CardTitle>
            <div className="dca-chart-wrap" ref={chartWrapRef}>
              {showSkeleton ? (
                <ChartSkeleton />
              ) : (
                <DcaGrowthChart points={chartPoints} width={chartSize.width} height={chartSize.height} />
              )}
            </div>
            {!showSkeleton && (
              <div className="dca-chart-legend">
                <span className="dca-legend-item">
                  <span className="dca-legend-swatch" style={{ background: 'var(--primary)' }} />
                  Portfolio Value
                </span>
                <span className="dca-legend-item">
                  <span className="dca-legend-swatch dca-legend-swatch--dashed" />
                  Invested
                </span>
                {lump && (
                  <span className="dca-legend-item">
                    <span className="dca-legend-swatch" style={{ background: 'var(--chart-lump, #d97706)' }} />
                    Lump Sum
                  </span>
                )}
              </div>
            )}
          </Card>
          </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DCASimulation;
