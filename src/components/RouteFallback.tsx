import React from 'react';
import './RouteFallback.css';

interface Props {
  variant?: 'page' | 'inline';
}

const RouteFallback: React.FC<Props> = ({ variant = 'page' }) => {
  return (
    <div className={`rf-root rf-root--${variant}`} role="status" aria-label="Loading">
      <span className="rf-spinner" />
    </div>
  );
};

export default RouteFallback;
