import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import './Visualization.css';

const RecentActivityCard: React.FC = () => {
  return (
    <Card className="viz-card">
      <CardHeader>
        <CardTitle className="label-caps">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="viz-empty-text">No recent activity.</p>
        <p className="viz-empty-text viz-empty-text--sub">
          Add positions inside a portfolio to see activity here.
        </p>
      </CardContent>
    </Card>
  );
};

export default RecentActivityCard;
