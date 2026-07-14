import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { FEAR_GREED_BANDS, STATUS_TONE, descriptorForStatus, scoreToNeedleAngle } from '../utils/fearGreed';
import type { FearGreedIndex } from '../api/sentiment';
import './FearGreedGauge.css';

const TRACK_SLICES = FEAR_GREED_BANDS.map(band => ({ name: band.status, value: 20, color: band.color }));

function formatUpdated(timestamp: string): string {
  const updated = new Date(timestamp).getTime();
  if (Number.isNaN(updated)) return '';
  const diffMins = Math.max(0, Math.round((Date.now() - updated) / 60_000));
  if (diffMins < 1) return 'Updated just now';
  if (diffMins < 60) return `Updated ${diffMins}m ago`;
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `Updated ${diffHours}h ago`;
  return `Updated ${Math.round(diffHours / 24)}d ago`;
}

interface FearGreedGaugeProps {
  data?: FearGreedIndex;
  isLoading: boolean;
  isError: boolean;
}

const FearGreedGauge: React.FC<FearGreedGaugeProps> = ({ data, isLoading, isError }) => {
  const angle = useMemo(() => scoreToNeedleAngle(data?.score ?? 50), [data?.score]);

  if (isLoading) {
    return (
      <>
        <div className="viz-skel viz-skel--gauge" />
        <div className="viz-skel viz-skel--title" />
      </>
    );
  }

  if (isError || !data) {
    return <p className="viz-empty-text">Sentiment data is unavailable right now — try again later.</p>;
  }

  return (
    <div className="fg-gauge">
      <div className="fg-gauge-chart">
        <ResponsiveContainer width="100%" height={120}>
          <PieChart>
            <Pie
              data={TRACK_SLICES}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="100%"
              startAngle={180}
              endAngle={0}
              innerRadius={70}
              outerRadius={94}
              stroke="none"
              isAnimationActive={false}
            >
              {TRACK_SLICES.map(slice => (
                <Cell key={slice.name} fill={slice.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="fg-needle" style={{ transform: `rotate(${angle}deg)` }} aria-hidden="true" />
        <div className="fg-pivot" aria-hidden="true" />
      </div>
      <div className="fg-readout">
        <span className="fg-score">{data.score}</span>
        <Badge variant={STATUS_TONE[data.status]} className="fg-status-badge">
          {data.status}
        </Badge>
      </div>
      <p className="viz-card-body fg-descriptor">{descriptorForStatus(data.status)}</p>
      <p className="viz-card-meta-sub fg-updated">{formatUpdated(data.timestamp)}</p>
    </div>
  );
};

export default FearGreedGauge;
