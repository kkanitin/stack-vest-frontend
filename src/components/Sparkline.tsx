import { useMemo } from 'react';
import type { HistoryPoint } from '../api/stocks';

interface SparklineProps {
  points: HistoryPoint[];
  height?: number;
  className?: string;
}

const Sparkline: React.FC<SparklineProps> = ({ points, height = 32, className }) => {
  const path = useMemo(() => {
    if (points.length < 2) return null;
    const vals = points.map(p => p.close);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    const pts = vals
      .map((v, i) => {
        const x = (i / (vals.length - 1)) * 100;
        const y = height - 1 - ((v - min) / range) * (height - 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
    const positive = vals[vals.length - 1] >= vals[0];
    return { pts, positive };
  }, [points, height]);

  const vb = `0 0 100 ${height}`;

  if (!path) {
    return (
      <svg width="100%" height={height} viewBox={vb} preserveAspectRatio="none" className={className}>
        <line
          x1="0" y1={height / 2} x2="100" y2={height / 2}
          stroke="var(--border-strong)" strokeWidth="1.5" strokeDasharray="4 2"
        />
      </svg>
    );
  }

  const color = path.positive ? 'var(--success)' : 'var(--loss)';
  return (
    <svg width="100%" height={height} viewBox={vb} preserveAspectRatio="none" className={className}>
      <polyline
        points={path.pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};

export default Sparkline;
