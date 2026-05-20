import React, { useMemo, useState } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';
import SegmentedControl from './ui/SegmentedControl';
import type { Segment } from './ui/SegmentedControl';
import './DCASimulation.css';

// TODO(mock): DCA backtest engine doesn't exist yet. We generate a deterministic
// portfolio growth curve from the form inputs so the chart and KPI strip behave
// like the real thing for demo purposes.

type Frequency = 'weekly' | 'biweekly' | 'monthly';

const FREQ_SEGMENTS: Segment<Frequency>[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const ASSETS = [
  { value: 'BTC', label: 'BTC — Bitcoin' },
  { value: 'ETH', label: 'ETH — Ethereum' },
  { value: 'SOL', label: 'SOL — Solana' },
];

interface SimResult {
  points: { invested: number; value: number; date: string }[];
  totalInvested: number;
  currentValue: number;
  roi: number;
  avgBuyPrice: number;
}

function runMockSimulation(amount: number, freq: Frequency, start: string, end: string): SimResult {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const stepDays = freq === 'weekly' ? 7 : freq === 'biweekly' ? 14 : 30;
  const points: SimResult['points'] = [];

  let invested = 0;
  let units = 0;
  let value = 0;
  let price = 26000;
  // Deterministic-ish drift up with mild oscillation; meant to look like BTC.
  let t = 0;
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + stepDays)) {
    const noise = Math.sin(t / 2) * 0.06 + Math.cos(t / 5) * 0.04;
    price = price * (1 + 0.012 + noise);
    invested += amount;
    units += amount / price;
    value = units * price;
    points.push({ invested, value, date: d.toISOString().slice(0, 10) });
    t += 1;
  }

  const avgBuyPrice = units > 0 ? invested / units : 0;
  const roi = invested > 0 ? ((value - invested) / invested) * 100 : 0;
  return { points, totalInvested: invested, currentValue: value, roi, avgBuyPrice };
}

function fmtMoney(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function GrowthChart({ points }: { points: SimResult['points'] }) {
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

const DCASimulation: React.FC = () => {
  const [asset, setAsset] = useState('BTC');
  const [amount, setAmount] = useState(100);
  const [freq, setFreq] = useState<Frequency>('weekly');
  const [start, setStart] = useState('2024-01-01');
  const [end, setEnd] = useState('2025-12-31');

  const result = useMemo(() => runMockSimulation(amount, freq, start, end), [amount, freq, start, end]);

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
        <Button variant="outline">Export CSV</Button>
      </header>

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

          <Button variant="primary" block className="dca-run">Run Simulation</Button>
          {/* TODO(mock): live re-runs as inputs change; button is presentational. */}
        </Card>

        <div className="dca-right">
          <div className="dca-kpis">
            <div className="dca-kpi">
              <div className="dca-kpi-label">Total Invested</div>
              <div className="dca-kpi-value">{fmtMoney(result.totalInvested)}</div>
            </div>
            <div className="dca-kpi">
              <div className="dca-kpi-label">Current Value</div>
              <div className="dca-kpi-value">{fmtMoney(result.currentValue)}</div>
            </div>
            <div className="dca-kpi">
              <div className="dca-kpi-label">ROI</div>
              <div className={`dca-kpi-value ${result.roi >= 0 ? 'positive' : 'negative'}`}>
                {fmtPct(result.roi)}
              </div>
            </div>
            <div className="dca-kpi">
              <div className="dca-kpi-label">Avg Buy Price</div>
              <div className="dca-kpi-value">{fmtMoney(result.avgBuyPrice)}</div>
            </div>
          </div>

          <Card label="Portfolio Growth" className="dca-chart-card">
            <div className="dca-chart-wrap">
              <GrowthChart points={result.points} />
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
        </div>
      </div>
    </div>
  );
};

export default DCASimulation;
