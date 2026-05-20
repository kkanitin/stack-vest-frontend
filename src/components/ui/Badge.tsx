import React from 'react';
import './Badge.css';

type Tone = 'neutral' | 'primary' | 'success' | 'error' | 'warning';

interface BadgeProps {
  tone?: Tone;
  pill?: boolean;
  mono?: boolean;
  children: React.ReactNode;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ tone = 'neutral', pill = false, mono = false, className = '', children }) => {
  const classes = [
    'sv-badge',
    `sv-badge--${tone}`,
    pill ? 'sv-badge--pill' : '',
    mono ? 'sv-badge--mono' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return <span className={classes}>{children}</span>;
};

export default Badge;
