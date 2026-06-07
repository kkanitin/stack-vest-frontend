import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { PortfolioPosition } from '../api/portfolio';
import './Visualization.css';

const COLORS = ['#a1ced9', '#2d5a64', '#f2bb95', '#4ade80', '#f87171', '#a78bfa', '#fb923c', '#38bdf8'];

interface AllocationSlice {
  symbol: string;
  value: number;
  pct: number;
  color: string;
}

interface AllocationDonutProps {
  positions: PortfolioPosition[];
  isLoading: boolean;
}

const AllocationDonut: React.FC<AllocationDonutProps> = ({ positions, isLoading }) => {
  const slices = useMemo<AllocationSlice[]>(() => {
    const valued = positions.filter(p => p.valueUsd > 0);
    const total = valued.reduce((s, p) => s + p.valueUsd, 0);
    if (total === 0) return [];
    return valued.map((p, i) => ({
      symbol: p.symbol,
      value: p.valueUsd,
      pct: (p.valueUsd / total) * 100,
      color: COLORS[i % COLORS.length],
    }));
  }, [positions]);

  if (isLoading) {
    return <div className="viz-skel viz-skel--donut" />;
  }

  return (
    <div className="viz-allocation">
      <div className="viz-donut-wrap">
        <ResponsiveContainer width={160} height={160}>
          <PieChart>
            <Pie
              data={slices.length ? slices : [{ symbol: 'empty', value: 1, pct: 100, color: 'var(--surface-highest)' }]}
              dataKey="value"
              nameKey="symbol"
              innerRadius={42}
              outerRadius={60}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive={false}
            >
              {(slices.length ? slices : [{ symbol: 'empty', value: 1, pct: 100, color: 'var(--surface-highest)' }]).map(s => (
                <Cell key={s.symbol} fill={s.color} />
              ))}
            </Pie>
            {slices.length > 0 && (
              <Tooltip
                formatter={(_value: number, name: string) => {
                  const slice = slices.find(s => s.symbol === name);
                  return [`${slice ? slice.pct.toFixed(1) : '0.0'}%`, name];
                }}
                contentStyle={{
                  background: 'var(--surface-high)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r)',
                  fontSize: 12,
                  fontFamily: 'var(--mono)',
                }}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
        <div className="viz-donut-overlay" aria-hidden="true">
          <span className="viz-donut-num">{slices.length}</span>
          <span className="viz-donut-lbl">{slices.length === 1 ? 'ASSET' : 'ASSETS'}</span>
        </div>
      </div>
      <ul className="viz-legend">
        {slices.length === 0 ? (
          <li className="viz-legend-empty">No valued positions to allocate yet.</li>
        ) : (
          slices.map(s => (
            <li key={s.symbol} className="viz-legend-row">
              <span className="viz-legend-swatch" style={{ background: s.color }} />
              <span className="viz-legend-symbol">{s.symbol}</span>
              <span className="viz-legend-pct">{s.pct.toFixed(1)}%</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

export default AllocationDonut;
