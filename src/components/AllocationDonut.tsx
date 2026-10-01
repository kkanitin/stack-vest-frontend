import React from 'react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { OTHER_KEY } from '../utils/holdings';
import type { AllocationSlice } from '../utils/holdings';
import './Visualization.css';

// Fixed order, never cycled: allocationSlices() caps named slices at the palette size
// and folds the rest into "Other", which takes the neutral series colour.
const SERIES = [
  'var(--series-1)',
  'var(--series-2)',
  'var(--series-3)',
  'var(--series-4)',
  'var(--series-5)',
];
const OTHER_COLOR = 'var(--series-other)';
const EMPTY_SLICE: AllocationSlice[] = [{ key: 'empty', label: '', valueUsd: 1, weight: 100 }];

function sliceColor(slice: AllocationSlice, index: number): string {
  return slice.key === OTHER_KEY ? OTHER_COLOR : SERIES[index] ?? OTHER_COLOR;
}

interface AllocationDonutProps {
  slices: AllocationSlice[];
  /** Number of priced holdings behind the slices (more than the slice count once "Other" appears). */
  assetCount: number;
  isLoading: boolean;
}

const AllocationDonut: React.FC<AllocationDonutProps> = ({ slices, assetCount, isLoading }) => {
  if (isLoading) {
    return <div className="viz-skel viz-skel--donut" />;
  }

  const hasData = slices.length > 0;

  return (
    <div className="viz-allocation">
      <div className="viz-donut-wrap">
        <PieChart width={160} height={160}>
          <Pie
            data={hasData ? slices : EMPTY_SLICE}
            dataKey="valueUsd"
            nameKey="label"
            innerRadius={46}
            outerRadius={64}
            startAngle={90}
            endAngle={-270}
            stroke="var(--card)"
            strokeWidth={hasData && slices.length > 1 ? 2 : 0}
            isAnimationActive={false}
          >
            {(hasData ? slices : EMPTY_SLICE).map((s, i) => (
              <Cell key={s.key} fill={hasData ? sliceColor(s, i) : 'var(--surface-highest)'} />
            ))}
          </Pie>
          {hasData && (
            <Tooltip
              formatter={(_value, rawName) => {
                const name = String(rawName);
                const slice = slices.find(s => s.label === name);
                return [`${slice ? slice.weight.toFixed(1) : '0.0'}%`, name];
              }}
              contentStyle={{
                background: 'var(--surface-high)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--r)',
                fontSize: 12,
                fontFamily: 'var(--mono)',
              }}
              itemStyle={{ color: 'var(--text-h)' }}
            />
          )}
        </PieChart>
        <div className="viz-donut-overlay" aria-hidden="true">
          <span className="viz-donut-num">{assetCount}</span>
          <span className="viz-donut-lbl">{assetCount === 1 ? 'ASSET' : 'ASSETS'}</span>
        </div>
      </div>
      <ul className="viz-legend">
        {hasData ? (
          slices.map((s, i) => (
            <li key={s.key} className="viz-legend-row">
              <span className="viz-legend-swatch" style={{ background: sliceColor(s, i) }} />
              <span className="viz-legend-symbol">{s.label}</span>
              <span className="viz-legend-pct">{s.weight.toFixed(1)}%</span>
            </li>
          ))
        ) : (
          <li className="viz-legend-empty">No valued positions to allocate yet.</li>
        )}
      </ul>
    </div>
  );
};

export default AllocationDonut;
