import React, { useState } from 'react';
import { nearestIndex } from '../utils/dcaChart';
import {
  describeGoalChart,
  fmtCompact,
  fmtYearLabel,
  valueTicks,
  yearTicks,
  type GoalChartPoint,
} from '../utils/goalChart';
import { fmtAmount, fmtRate } from '../utils/format';
import type { GoalRange } from '../utils/goalMath';
import './GoalGrowthChart.css';

interface Props {
  points: GoalChartPoint[];
  /** Low / expected / high annual returns in percent, for the readout. */
  returns: GoalRange<number>;
  currency: string;
  /** Draws a horizontal line at this amount (target goals). */
  target?: number;
  width: number;
  height: number;
}

const PAD_L = 48;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 30;

/**
 * Hand-drawn SVG chart of a goal plan over the years: amount invested, expected value with a
 * shaded low–high band, and an optional target line. Hover or tap shows a readout; the SVG
 * carries a one-sentence text alternative. Follows the `DcaGrowthChart` pattern.
 */
const GoalGrowthChart: React.FC<Props> = ({ points, returns, currency, target, width, height }) => {
  const [hover, setHover] = useState<number | null>(null);

  if (points.length === 0) {
    return <svg viewBox={`0 0 ${width} ${height}`} className="goal-chart" role="img" aria-label="Goal growth chart: no data." />;
  }

  const innerW = width - PAD_L - PAD_R;
  const innerH = height - PAD_T - PAD_B;

  const years = points.map(p => p.year);
  const span = Math.max(years[years.length - 1], 1 / 12);
  const yTicks = valueTicks(Math.max(...points.flatMap(p => [p.invested, p.value.high, p.value.expected]), target ?? 0));
  const maxV = yTicks[yTicks.length - 1];

  const x = (year: number) => PAD_L + (year / span) * innerW;
  const y = (v: number) => PAD_T + innerH - (Math.max(v, 0) / maxV) * innerH;
  const pt = (i: number, v: number) => `${x(years[i]).toFixed(1)} ${y(v).toFixed(1)}`;

  const line = (pick: (p: GoalChartPoint) => number) =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${pt(i, pick(p))}`).join(' ');
  const expectedPath = line(p => p.value.expected);
  const investedPath = line(p => p.invested);
  // Along the high values, then back along the low values.
  const bandPath =
    points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${pt(i, p.value.high)}`).join(' ') +
    ' ' +
    points.map((_, j) => {
      const i = points.length - 1 - j;
      return `L ${pt(i, points[i].value.low)}`;
    }).join(' ') +
    ' Z';

  const xTicks = yearTicks(span, width < 480 ? 3 : 6);

  const select = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const px = ((e.clientX - rect.left) / rect.width) * width;
    setHover(nearestIndex(years, ((px - PAD_L) / innerW) * span));
  };

  const hp = hover !== null ? points[hover] : null;
  const hx = hover !== null ? x(years[hover]) : 0;
  const amount = (n: number) => fmtAmount(n, currency);

  return (
    <div className="goal-chart-box">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="goal-chart"
        preserveAspectRatio="none"
        role="img"
        aria-label={describeGoalChart(points, currency, target)}
        onPointerMove={select}
        onPointerDown={select}
        onPointerLeave={e => { if (e.pointerType !== 'touch') setHover(null); }}
      >
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={PAD_L} x2={width - PAD_R} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth="1" />
            <text x={PAD_L - 8} y={y(v) + 4} textAnchor="end" className="goal-chart-tick">
              {fmtCompact(v)}
            </text>
          </g>
        ))}

        {xTicks.map((yr, i) => (
          <text
            key={yr}
            x={x(yr)}
            y={height - 8}
            textAnchor={i === 0 ? 'start' : x(yr) > width - PAD_R - 24 ? 'end' : 'middle'}
            className="goal-chart-tick"
          >
            {fmtYearLabel(yr)}
          </text>
        ))}

        <path d={bandPath} className="goal-chart-band" />
        <path d={investedPath} fill="none" stroke="var(--text-dim)" strokeWidth="1.5" strokeDasharray="4 4" />
        <path d={expectedPath} fill="none" stroke="var(--primary)" strokeWidth="2" />
        {target !== undefined && (
          <line
            data-testid="goal-chart-target"
            x1={PAD_L}
            x2={width - PAD_R}
            y1={y(target)}
            y2={y(target)}
            className="goal-chart-target"
          />
        )}

        {hp && (
          <g pointerEvents="none">
            <line x1={hx} x2={hx} y1={PAD_T} y2={PAD_T + innerH} stroke="var(--text-dim)" strokeWidth="1" />
            <circle cx={hx} cy={y(hp.invested)} r="3.5" fill="var(--text-dim)" />
            <circle cx={hx} cy={y(hp.value.expected)} r="4" fill="var(--primary)" stroke="var(--surface)" strokeWidth="1.5" />
          </g>
        )}
      </svg>

      {hp && (
        <div
          className="goal-chart-tip"
          style={{ left: `${(hx / width) * 100}%` }}
          data-flip={hx > width / 2 ? 'left' : 'right'}
        >
          <div className="goal-chart-tip-year">{fmtYearLabel(hp.year)}</div>
          <div>Invested <strong>{amount(hp.invested)}</strong></div>
          <div>Low ({fmtRate(returns.low)}) <strong>{amount(hp.value.low)}</strong></div>
          <div>Expected ({fmtRate(returns.expected)}) <strong>{amount(hp.value.expected)}</strong></div>
          <div>High ({fmtRate(returns.high)}) <strong>{amount(hp.value.high)}</strong></div>
        </div>
      )}
    </div>
  );
};

export default GoalGrowthChart;
