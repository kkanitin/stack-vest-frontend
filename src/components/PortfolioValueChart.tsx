import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { usePortfolioValueHistory } from '../hooks/usePortfolioValueHistory';
import type { ValueHistoryRange } from '../api/portfolios';
import { fmtMoney } from '../utils/format';
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

const PortfolioValueChart: React.FC = () => {
  const [range, setRange] = useState<ValueHistoryRange>('30D');
  const { data, isLoading, isError } = usePortfolioValueHistory(range);
  const points = data?.points ?? [];
  const first = points[0];
  const last = points[points.length - 1];

  return (
    <section className="viz-trend" aria-label="Recorded value history">
      <header className="viz-trend-head">
        <span className="viz-trend-title">Recorded value</span>
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
            aria-label={`Total value from ${fmtMoney(first.value)} on ${fmtDay(first.date, true)} to ${fmtMoney(last.value)} on ${fmtDay(last.date, true)}`}
          >
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
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
                  tickFormatter={fmtAxisMoney}
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
                  formatter={v => [fmtMoney(Number(v)), 'Total value']}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="currentColor"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, stroke: 'var(--card)', strokeWidth: 2, fill: 'currentColor' }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="viz-trend-note">
            What your holdings were worth each day, as recorded. Today's point is updated every few hours, so it can
            trail the total above.
          </p>
        </>
      )}
    </section>
  );
};

export default PortfolioValueChart;
