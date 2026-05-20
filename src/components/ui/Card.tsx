import React from 'react';
import './Card.css';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  level?: 1 | 2;
  padded?: boolean;
}

const Card: React.FC<CardProps> = ({ label, level = 1, padded = true, className = '', children, ...rest }) => {
  const classes = ['sv-card', `sv-card--l${level}`, padded ? 'sv-card--padded' : '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={classes} {...rest}>
      {label && <div className="sv-card-label label-caps">{label}</div>}
      {children}
    </div>
  );
};

export default Card;
