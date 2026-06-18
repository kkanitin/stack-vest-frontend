import React from 'react';
import './Input.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  mono?: boolean;
}

const Input: React.FC<InputProps> = ({ label, hint, error, mono = false, id, className = '', ...rest }) => {
  const inputClasses = [
    'sv-input',
    mono ? 'sv-input--mono' : '',
    error ? 'sv-input--invalid' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="sv-field">
      {label && (
        <label className="sv-label" htmlFor={id}>
          {label}
        </label>
      )}
      <input id={id} className={inputClasses} aria-invalid={!!error} {...rest} />
      {error ? (
        <span className="sv-hint sv-hint--err">{error}</span>
      ) : hint ? (
        <span className="sv-hint">{hint}</span>
      ) : null}
    </div>
  );
};

export default Input;
