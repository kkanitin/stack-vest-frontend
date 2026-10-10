import React, { useState } from 'react';
import {
  axisDates,
  dateMs,
  describeChart,
  formatAxisDate,
  formatFullDate,
  nearestIndex,
} from '../utils/dcaChart';
import type { ChartPoint } from '../utils/dcaChart';

interface Props {
  points: ChartPoint[];
  width: number;
  height: number;
}

const PAD_L = 48;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 30;

function fmtMoney(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * Hand-drawn SVG growth chart: dated x-axis, a hover/tap readout, and a text alternative.
 * The x-axis is time-scaled, so uneven gaps between purchases are drawn to scale.
 */
const DcaGrowthChart: React.FC<Props> = ({ points, width, height }) => {
  const [hover, setHover] = useState<number | null>(null);

  if (points.length === 0) {
    return <svg viewBox={`0 0 ${width} ${height}`} className="dca-chart" role="img" aria-label="Portfolio growth chart: no data." />;
  }

  const innerW = width - PAD_L - PAD_R;
  const innerH = height - PAD_T - PAD_B;

  const times = points.map(p => dateMs(p.date));
  const t0 = times[0];
  const span = Math.max(times[times.length - 1] - t0, 1);
  const maxV = Math.max(...points.flatMap(p => [p.invested, p.value, p.lump ?? 0]), 1);

  const x = (t: number) => PAD_L + ((t - t0) / span) * innerW;
  const y = (v: number) => PAD_T + innerH - (v / maxV) * innerH;

  const line = (pick: (p: ChartPoint) => number) =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(times[i]).toFixed(1)} ${y(pick(p)).toFixed(1)}`).join(' ');
  const valuePath = line(p => p.value);
  const hasLump = points[0].lump !== undefined;
  const lumpPath = hasLump ? line(p => p.lump ?? 0) : '';
  const investedPath = line(p => p.invested);
  const baseline = (PAD_T + innerH).toFixed(1);
  const areaPath = `${valuePath} L ${x(times[times.length - 1]).toFixed(1)} ${baseline} L ${x(t0).toFixed(1)} ${baseline} Z`;

  const yTicks = Array.from({ length: 5 }, (_, i) => (maxV / 4) * i);

  const first = points[0].date;
  const last = points[points.length - 1].date;
  const xLabels = axisDates(first, last, width < 480 ? 3 : 5);

  const select = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const px = ((e.clientX - rect.left) / rect.width) * width;
    setHover(nearestIndex(times, t0 + ((px - PAD_L) / innerW) * span));
  };

  const hp = hover !== null ? points[hover] : null;
  const hx = hover !== null ? x(times[hover]) : 0;

  return (
    <div className="dca-chart-box">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="dca-chart"
        preserveAspectRatio="none"
        role="img"
        aria-label={describeChart(points)}
        onPointerMove={select}
        onPointerDown={select}
        onPointerLeave={e => { if (e.pointerType !== 'touch') setHover(null); }}
      >
        <defs>
          <linearGradient id="dca-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={PAD_L} x2={width - PAD_R} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth="1" />
            <text x={PAD_L - 8} y={y(v) + 4} textAnchor="end" className="dca-chart-tick">
              {v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${Math.round(v)}`}
            </text>
          </g>
        ))}

        {xLabels.map((d, i) => (
          <text
            key={d}
            x={x(dateMs(d))}
            y={height - 8}
            textAnchor={i === 0 ? 'start' : i === xLabels.length - 1 ? 'end' : 'middle'}
            className="dca-chart-tick"
          >
            {formatAxisDate(d, first, last)}
          </text>
        ))}

        <path d={areaPath} fill="url(#dca-area)" />
        <path d={investedPath} fill="none" stroke="var(--text-dim)" strokeWidth="1.5" strokeDasharray="4 4" />
        {hasLump && <path d={lumpPath} fill="none" stroke="var(--chart-lump, #d97706)" strokeWidth="2" />}
        <path d={valuePath} fill="none" stroke="var(--primary)" strokeWidth="2" />

        {hp && (
          <g pointerEvents="none">
            <line x1={hx} x2={hx} y1={PAD_T} y2={PAD_T + innerH} stroke="var(--text-dim)" strokeWidth="1" />
            <circle cx={hx} cy={y(hp.invested)} r="3.5" fill="var(--text-dim)" />
            {hp.lump !== undefined && <circle cx={hx} cy={y(hp.lump)} r="4" fill="var(--chart-lump, #d97706)" />}
            <circle cx={hx} cy={y(hp.value)} r="4" fill="var(--primary)" stroke="var(--surface)" strokeWidth="1.5" />
          </g>
        )}
      </svg>

      {hp && (
        <div
          className="dca-chart-tip"
          style={{ left: `${(hx / width) * 100}%` }}
          data-flip={hx > width / 2 ? 'left' : 'right'}
        >
          <div className="dca-chart-tip-date">{formatFullDate(hp.date)}</div>
          <div>Value <strong>{fmtMoney(hp.value)}</strong></div>
          {hp.lump !== undefined && <div>Lump sum <strong>{fmtMoney(hp.lump)}</strong></div>}
          <div>Invested <strong>{fmtMoney(hp.invested)}</strong></div>
        </div>
      )}
    </div>
  );
};

export default DcaGrowthChart;
