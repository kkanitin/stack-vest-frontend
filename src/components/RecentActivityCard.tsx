import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRecentActivity } from '../hooks/useRecentActivity';
import { fmtRelativeTime } from '../utils/format';
import type { ActivityTone } from '../api/portfolios';
import './Visualization.css';

const VISIBLE_LIMIT = 6;

// The tone describes the kind of action, not a gain or loss, so a buy takes the brand
// tone rather than the gain colour.
const TONE_VARIANT = {
  positive: 'primary',
  negative: 'error',
  neutral: 'neutral',
} as const satisfies Record<ActivityTone, 'primary' | 'error' | 'neutral'>;

const RecentActivityCard: React.FC = () => {
  const { data, isLoading, isError } = useRecentActivity(VISIBLE_LIMIT);
  const entries = data ?? [];

  return (
    <Card className="viz-card">
      <CardHeader>
        <CardTitle className="label-caps">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          [0, 1, 2].map(i => <div key={i} className="viz-skel viz-skel--row" />)
        ) : isError ? (
          <p className="viz-empty-text">Couldn't load recent activity.</p>
        ) : entries.length === 0 ? (
          <>
            <p className="viz-empty-text">No recent activity.</p>
            <p className="viz-empty-text viz-empty-text--sub">
              Record a buy or sell to see it here.
            </p>
          </>
        ) : (
          <ul className="viz-list">
            {entries.map(a => (
              <li key={a.id} className="viz-list-row">
                <div className="viz-activity-main">
                  <Badge variant={TONE_VARIANT[a.tone] ?? 'neutral'} className="viz-activity-badge">
                    {a.badge}
                  </Badge>
                  <div className="viz-activity-text">
                    <span className="viz-activity-name">{a.label}</span>
                    <span className="viz-activity-detail">
                      {a.portfolioName ? `${a.detail} · ${a.portfolioName}` : a.detail}
                    </span>
                  </div>
                </div>
                <time className="viz-activity-time" dateTime={a.timestamp}>
                  {fmtRelativeTime(a.timestamp)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivityCard;
