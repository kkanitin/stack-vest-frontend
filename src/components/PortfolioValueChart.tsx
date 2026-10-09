import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { usePortfolioValueHistory } from '../hooks/usePortfolioValueHistory';
import { useBenchmarks } from '../hooks/useBenchmarks';
import { useBenchmarkPreference } from '../hooks/useBenchmarkPreference';
import type { ValueHistoryRange } from '../api/portfolios';
import { fmtMoney, fmtPct } from '../utils/format';
import { pctChangeSeries } from '../utils/pctChangeSeries';
import './Visualization.css';

const RANGES: ValueHistoryRange[] = ['30D', '90D', '1Y', 'All'];

// Snapshot dates are UTC calendar days; format them in UTC so they never shift by a day.
function fmtDay(date: string, withYear = false): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  });
}

function fmtAxisMoney(v: number): string {
  return `$${v.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 })}`;
}

function fmtAxisPct(v: number): string {
  return fmtPct(v, 0);
}

const PortfolioValueChart: React.FC = () => {
  const [range, setRange] = useState<ValueHistoryRange>('30D');
  const { data: benchmarks } = useBenchmarks();
  const [benchmark, setBenchmark] = useBenchmarkPreference(benchmarks);
  const { data, isLoading, isError } = usePortfolioValueHistory(range, benchmark);
  const points = data?.points ?? [];
  const first = points[0];
  const last = points[points.length - 1];

  // Only trust benchmark data that belongs to the current choice (the previous data stays on screen while loading).
  const info = benchmark && data?.benchmark?.symbol === benchmark ? data.benchmark : null;
  const unavailable = info !== null && !info.available;
  const pctRows = info?.available ? pctChangeSeries(points) : [];
  const compare = info !== null && pctRows.length >= 2;
  const pctFirst = pctRows[0];
  const pctLast = pctRows[pctRows.length - 1];

  return (
    <section className="viz-trend" aria-label="Recorded value history">
      <header className="viz-trend-head">
        <span className="viz-trend-title">Recorded value</span>
        <div className="viz-trend-controls">
          {benchmarks && benchmarks.length > 0 && (
            <label className="viz-compare">
              <span className="viz-compare-label">Compare with</span>
              <select
                className="viz-compare-select"
                value={benchmark ?? ''}
                onChange={e => setBenchmark(e.target.value || null)}
              >
                <option value="">None</option>
                {benchmarks.map(b => (
                  <option key={b.symbol} value={b.symbol}>
                    {b.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="viz-ranges" role="group" aria-label="Chart time range">
            {RANGES.map(r => (
              <button
                key={r}
                type="button"
                className={`viz-range${r === range ? ' viz-range--on' : ''}`}
                aria-pressed={r === range}
                onClick={() => setRange(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="viz-skel viz-skel--chart" />
      ) : isError ? (
        <p className="viz-trend-empty">Value history is unavailable right now.</p>
      ) : points.length < 2 ? (
        <p className="viz-trend-empty">
          Not enough history yet. Your total value is recorded once a day
          {first ? `, starting ${fmtDay(first.date)}` : ''}; the chart appears once there are two days to compare.
        </p>
      ) : (
        <>
          <div
            className="viz-trend-chart"
            role="img"
            aria-label={
              compare
                ? `Percent change since ${fmtDay(pctFirst.date, true)}: portfolio ${fmtPct(pctLast.portfolioPct)}, ${info.label} ${fmtPct(pctLast.benchmarkPct)}`
                : `Total value from ${fmtMoney(first.value)} on ${fmtDay(first.date, true)} to ${fmtMoney(last.value)} on ${fmtDay(last.date, true)}`
            }
          >
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={compare ? pctRows : points} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={d => fmtDay(String(d))}
                  tick={{ fontSize: 11, fill: 'var(--text-dim)', fontFamily: 'var(--mono)' }}
                  interval="preserveStartEnd"
                  minTickGap={40}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={compare ? fmtAxisPct : fmtAxisMoney}
                  tick={{ fontSize: 11, fill: 'var(--text-dim)', fontFamily: 'var(--mono)' }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  cursor={{ stroke: 'var(--border-strong)' }}
                  contentStyle={{
                    background: 'var(--surface-high)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 'var(--r)',
                    fontSize: 12,
                    fontFamily: 'var(--mono)',
                  }}
                  labelStyle={{ color: 'var(--text-dim)' }}
                  itemStyle={{ color: 'var(--text-h)' }}
                  labelFormatter={label => fmtDay(String(label), true)}
                  formatter={(v, name) =>
                    compare ? [fmtPct(Number(v)), String(name)] : [fmtMoney(Number(v)), 'Total value']
                  }
                />
                {compare && <ReferenceLine y={0} stroke="var(--border-strong)" />}
                <Line
                  type="monotone"
                  name={compare ? 'Portfolio' : 'Total value'}
                  dataKey={compare ? 'portfolioPct' : 'value'}
                  stroke="currentColor"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, stroke: 'var(--card)', strokeWidth: 2, fill: 'currentColor' }}
                  isAnimationActive={false}
                />
                {compare && (
                  <Line
                    type="monotone"
                    name={info.label}
                    dataKey="benchmarkPct"
                    stroke="var(--benchmark)"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                    activeDot={{ r: 4, stroke: 'var(--card)', strokeWidth: 2, fill: 'var(--benchmark)' }}
                    isAnimationActive={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
          {compare && (
            <ul className="viz-legend" aria-hidden="true">
              <li className="viz-legend-item">
                <span className="viz-legend-swatch viz-legend-swatch--portfolio" />
                Portfolio
              </li>
              <li className="viz-legend-item">
                <span className="viz-legend-swatch viz-legend-swatch--benchmark" />
                {info.label}
              </li>
            </ul>
          )}
          {unavailable && <p className="viz-trend-note">{info.label} data is unavailable right now.</p>}
          <p className="viz-trend-note">
            {compare
              ? `% change from ${fmtDay(pctFirst.date)}. The portfolio line is a time-weighted return, so money you add or withdraw does not move it.`
              : "What your holdings were worth each day, as recorded, including money added or withdrawn. Today's point is updated every few hours, so it can trail the total above."}
          </p>
        </>
      )}
    </section>
  );
};

export default PortfolioValueChart;
