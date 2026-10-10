import React, { useState } from 'react';
import { axisDates, dateMs, formatAxisDate, formatFullDate, nearestIndex } from '../utils/dcaChart';
import { describeCompare, pctAt, unionDates } from '../utils/dcaCompare';
import type { CompareSeries } from '../utils/dcaCompare';

interface Props {
  series: CompareSeries[];
  width: number;
  height: number;
}

const PAD_L = 52;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 30;

function fmtPct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

/** Percentage-return lines for several assets on one time-scaled axis, with a hover/tap readout. */
const DcaCompareChart: React.FC<Props> = ({ series, width, height }) => {
  const [hover, setHover] = useState<string | null>(null);
  const dates = unionDates(series);

  if (dates.length === 0) {
    return <svg viewBox={`0 0 ${width} ${height}`} className="dca-chart" role="img" aria-label="Return comparison chart: no data." />;
  }

  const innerW = width - PAD_L - PAD_R;
  const innerH = height - PAD_T - PAD_B;
  const times = dates.map(dateMs);
  const t0 = times[0];
  const span = Math.max(times[times.length - 1] - t0, 1);

  const all = series.flatMap(s => s.points.map(p => p.pct));
  const lo = Math.min(0, ...all);
  const hi = Math.max(0, ...all);
  const range = hi - lo || 1;

  const x = (t: number) => PAD_L + ((t - t0) / span) * innerW;
  const y = (v: number) => PAD_T + innerH - ((v - lo) / range) * innerH;

  const yTicks = Array.from({ length: 5 }, (_, i) => lo + (range / 4) * i);
  const xLabels = axisDates(dates[0], dates[dates.length - 1], width < 480 ? 3 : 5);

  const pick = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const px = ((e.clientX - rect.left) / rect.width) * width;
    setHover(dates[nearestIndex(times, t0 + ((px - PAD_L) / innerW) * span)]);
  };

  const hx = hover ? x(dateMs(hover)) : 0;

  return (
    <div className="dca-chart-box">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="dca-chart"
        preserveAspectRatio="none"
        role="img"
        aria-label={describeCompare(series)}
        onPointerMove={pick}
        onPointerDown={pick}
        onPointerLeave={e => { if (e.pointerType !== 'touch') setHover(null); }}
      >
        {yTicks.map((v, i) => (
          <g key={i}>
            <line
              x1={PAD_L} x2={width - PAD_R} y1={y(v)} y2={y(v)}
              stroke="var(--border)" strokeWidth="1"
            />
            <text x={PAD_L - 8} y={y(v) + 4} textAnchor="end" className="dca-chart-tick">{`${Math.round(v)}%`}</text>
          </g>
        ))}
        <line x1={PAD_L} x2={width - PAD_R} y1={y(0)} y2={y(0)} stroke="var(--text-dim)" strokeWidth="1" strokeDasharray="4 4" />

        {xLabels.map((d, i) => (
          <text
            key={d}
            x={x(dateMs(d))}
            y={height - 8}
            textAnchor={i === 0 ? 'start' : i === xLabels.length - 1 ? 'end' : 'middle'}
            className="dca-chart-tick"
          >
            {formatAxisDate(d, dates[0], dates[dates.length - 1])}
          </text>
        ))}

        {series.map(s => (
          <path
            key={s.symbol}
            d={s.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(dateMs(p.date)).toFixed(1)} ${y(p.pct).toFixed(1)}`).join(' ')}
            fill="none"
            stroke={s.color}
            strokeWidth="2"
          />
        ))}

        {hover && (
          <g pointerEvents="none">
            <line x1={hx} x2={hx} y1={PAD_T} y2={PAD_T + innerH} stroke="var(--text-dim)" strokeWidth="1" />
            {series.map(s => {
              const v = pctAt(s, hover);
              return v === undefined ? null : <circle key={s.symbol} cx={hx} cy={y(v)} r="4" fill={s.color} />;
            })}
          </g>
        )}
      </svg>

      {hover && (
        <div
          className="dca-chart-tip"
          style={{ left: `${(hx / width) * 100}%` }}
          data-flip={hx > width / 2 ? 'left' : 'right'}
        >
          <div className="dca-chart-tip-date">{formatFullDate(hover)}</div>
          {series.map(s => {
            const v = pctAt(s, hover);
            return (
              <div key={s.symbol}>
                {s.symbol} <strong>{v === undefined ? '–' : fmtPct(v)}</strong>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DcaCompareChart;
