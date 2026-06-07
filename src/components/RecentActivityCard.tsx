import React from 'react';
import Card from './ui/Card';
import Badge from './ui/Badge';
import { usePortfolioActivity } from '../hooks/usePortfolioActivity';
import type { PortfolioActivity } from '../api/portfolio';
import './Visualization.css';

const TONE_MAP = {
  positive: 'success',
  negative: 'error',
  neutral: 'neutral',
} as const satisfies Record<string, 'success' | 'error' | 'neutral'>;

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
}

const RecentActivityCard: React.FC = () => {
  const { data: activity, isLoading, isError } = usePortfolioActivity(10);

  return (
    <Card label="Recent Activity" className="viz-card">
      {isLoading ? (
        <ul className="viz-activity">
          {[0, 1, 2].map(i => (
            <li key={i} className="viz-activity-row">
              <div className="viz-skel viz-skel--activity" />
            </li>
          ))}
        </ul>
      ) : isError ? (
        <p className="viz-empty-text">Couldn't load recent activity.</p>
      ) : activity && activity.length > 0 ? (
        <ul className="viz-activity">
          {activity.map((a: PortfolioActivity) => (
            <li key={a.id} className="viz-activity-row">
              <div className="viz-activity-main">
                {a.symbol && <span className="viz-activity-symbol">{a.symbol}</span>}
                <div className="viz-activity-text">
                  <span className="viz-activity-name">{a.label}</span>
                  <span className="viz-activity-detail">
                    {a.detail} · {relativeTime(a.timestamp)}
                  </span>
                </div>
              </div>
              <Badge tone={TONE_MAP[a.tone] ?? 'neutral'} mono>{a.badge}</Badge>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <p className="viz-empty-text">No recent activity.</p>
          <p className="viz-empty-text viz-empty-text--sub">Add your first position to see it appear here.</p>
        </>
      )}
    </Card>
  );
};

export default RecentActivityCard;
