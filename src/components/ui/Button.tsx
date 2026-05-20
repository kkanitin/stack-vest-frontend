import React from 'react';
import './Button.css';

type Variant = 'primary' | 'ghost' | 'outline' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  block?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  block = false,
  className = '',
  children,
  ...rest
}) => {
  const classes = ['sv-btn', `sv-btn--${variant}`, block ? 'sv-btn--block' : '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
};

export default Button;
