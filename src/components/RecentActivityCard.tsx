import React from 'react';
import Card from './ui/Card';
import './Visualization.css';

const RecentActivityCard: React.FC = () => {
  return (
    <Card label="Recent Activity" className="viz-card">
      <p className="viz-empty-text">No recent activity.</p>
      <p className="viz-empty-text viz-empty-text--sub">
        Add positions inside a portfolio to see activity here.
      </p>
    </Card>
  );
};

export default RecentActivityCard;
