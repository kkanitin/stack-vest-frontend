import React from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import './EmptyPortfolioState.css';

interface EmptyPortfolioStateProps {
  onAddPosition: () => void;
}

const EmptyPortfolioState: React.FC<EmptyPortfolioStateProps> = ({ onAddPosition }) => {
  return (
    <Card className="eps-card">
      <div className="eps-icon" aria-hidden="true">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" />
          <path d="M7 16l4-6 4 3 4-7" />
        </svg>
      </div>
      <h2 className="eps-title">Your portfolio is empty</h2>
      <p className="eps-sub">
        Add the assets you hold — shares and average cost — and we'll track live value,
        allocation, and performance for you.
      </p>
      <Button variant="primary" onClick={onAddPosition} className="eps-cta">
        Add Your First Position
      </Button>
    </Card>
  );
};

export default EmptyPortfolioState;
