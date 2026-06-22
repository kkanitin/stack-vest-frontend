import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { runDcaSimulation } from '../api/simulations';
import type { DcaResult } from '../api/simulations';
import Card from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';
import SegmentedControl from './ui/SegmentedControl';
import type { Segment } from './ui/SegmentedControl';
import './DCASimulation.css';

type Frequency = 'weekly' | 'biweekly' | 'monthly';

const FREQ_SEGMENTS: Segment<Frequency>[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const ASSETS = [
  { value: 'AAPL', label: 'AAPL — Apple' },
  { value: 'MSFT', label: 'MSFT — Microsoft' },
  { value: 'AMZN', label: 'AMZN — Amazon' },
  { value: 'TSLA', label: 'TSLA — Tesla' },
  { value: 'VOO', label: 'VOO — S&P 500 ETF' },
  { value: 'SPY', label: 'SPY — SPDR S&P 500' },
];

function fmtMoney(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

type ChartPoint = { date: string; invested: number; value: number };

function GrowthChart({ points }: { points: ChartPoint[] }) {
  if (points.length === 0) {
    return <svg viewBox="0 0 760 260" className="dca-chart" />;
  }
  const w = 760;
  const h = 260;
  const padL = 48;
  const padR = 16;
  const padT = 16;
  const padB = 30;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const values = points.flatMap(p => [p.invested, p.value]);
  const maxV = Math.max(...values, 1);
  const minV = 0;

  const x = (i: number) => padL + (i / Math.max(points.length - 1, 1)) * innerW;
  const y = (v: number) => padT + innerH - ((v - minV) / (maxV - minV || 1)) * innerH;

  const valuePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const investedPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.invested).toFixed(1)}`).join(' ');
  const areaPath = `${valuePath} L ${x(points.length - 1).toFixed(1)} ${(padT + innerH).toFixed(1)} L ${x(0).toFixed(1)} ${(padT + innerH).toFixed(1)} Z`;

  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => (maxV / ticks) * i);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="dca-chart" preserveAspectRatio="none">
      <defs>
        <linearGradient id="dca-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {yTicks.map((v, i) => (
        <g key={i}>
          <line
            x1={padL} x2={w - padR}
            y1={y(v)} y2={y(v)}
            stroke="var(--border)" strokeWidth="1"
          />
          <text x={padL - 8} y={y(v) + 4} textAnchor="end" className="dca-chart-tick">
            {v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${Math.round(v)}`}
          </text>
        </g>
      ))}

      <path d={areaPath} fill="url(#dca-area)" />
      <path d={investedPath} fill="none" stroke="var(--text-dim)" strokeWidth="1.5" strokeDasharray="4 4" />
      <path d={valuePath} fill="none" stroke="var(--primary)" strokeWidth="2" />
    </svg>
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
  const [asset, setAsset] = useState('AAPL');
  const [amount, setAmount] = useState(100);
  const [freq, setFreq] = useState<Frequency>('weekly');
  const [start, setStart] = useState('2024-01-01');
  const [end, setEnd] = useState('2025-12-31');

  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<DcaResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Guard against stale responses from superseded requests.
  const reqIdRef = useRef(0);
  // Skip debounce on the very first effect run (mount).
  const isFirstRun = useRef(true);

  const fetchSimulation = useCallback(async () => {
    if (!token) return;
    const reqId = ++reqIdRef.current;
    setStatus('loading');
    setError(null);
    try {
      const data = await runDcaSimulation(token, {
        symbol: asset,
        startDate: start,
        endDate: end,
        amount,
        frequency: freq,
      });
      if (reqId !== reqIdRef.current) return;
      setResult(data);
      setStatus('success');
    } catch (e) {
      if (reqId !== reqIdRef.current) return;
      setError(e instanceof Error ? e.message : 'Simulation failed');
      setStatus('error');
    }
  }, [token, asset, start, end, amount, freq]);

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
  const showSkeleton = (isLoading || status === 'error') && result === null;

  const chartPoints: ChartPoint[] = result?.dataPoints.map(dp => ({
    date: dp.date,
    invested: dp.totalInvested,
    value: dp.portfolioValue,
  })) ?? [];

  const avgBuyPrice = result && result.totalUnits > 0
    ? result.totalInvested / result.totalUnits
    : 0;

  return (
    <div className="dca">
      <header className="dca-head">
        <div className="dca-head-text">
          <div className="dca-title-row">
            <h1 className="dca-title">DCA Simulation</h1>
            <Badge tone="primary" pill>Beta</Badge>
          </div>
          <p className="dca-sub">Backtest dollar-cost averaging across any tracked asset.</p>
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
        <Card label="Simulation Parameters" className="dca-form">
          <div className="dca-field">
            <label className="dca-label">Target Asset</label>
            <select className="dca-select" value={asset} onChange={e => setAsset(e.target.value)}>
              {ASSETS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>

          <div className="dca-field">
            <label className="dca-label">Amount per Interval</label>
            <div className="dca-input-wrap">
              <span className="dca-input-prefix">$</span>
              <input
                className="dca-input dca-input--mono"
                type="number"
                min={1}
                value={amount}
                onChange={e => setAmount(Number(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="dca-field">
            <label className="dca-label">Frequency</label>
            <SegmentedControl<Frequency> segments={FREQ_SEGMENTS} value={freq} onChange={setFreq} />
          </div>

          <div className="dca-field-row">
            <div className="dca-field">
              <label className="dca-label">Start Date</label>
              <input
                className="dca-input dca-input--mono"
                type="date"
                value={start}
                onChange={e => setStart(e.target.value)}
              />
            </div>
            <div className="dca-field">
              <label className="dca-label">End Date</label>
              <input
                className="dca-input dca-input--mono"
                type="date"
                value={end}
                onChange={e => setEnd(e.target.value)}
              />
            </div>
          </div>

          <Button
            variant="primary"
            block
            className="dca-run"
            onClick={fetchSimulation}
            disabled={isLoading}
          >
            {isLoading ? 'Running…' : 'Run Simulation'}
          </Button>
        </Card>

        <div className="dca-right">
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
                <div className="dca-kpi-value">{fmtMoney(avgBuyPrice)}</div>
              </div>
            </div>
          )}

          <Card label="Portfolio Growth" className="dca-chart-card">
            <div className="dca-chart-wrap">
              {showSkeleton ? (
                <ChartSkeleton />
              ) : (
                <GrowthChart points={chartPoints} />
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
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DCASimulation;
