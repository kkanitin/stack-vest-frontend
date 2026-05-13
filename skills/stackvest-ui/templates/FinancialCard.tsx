import React from 'react';

interface FinancialCardProps {
  title: string;
  value: string | number;
  change?: number;
  label?: string;
}

/**
 * A standard financial data card following StackVest design principles:
 * - Precise alignment
 * - Monospaced numbers
 * - Subtle borders and theme-aware colors
 * - Smooth hover transitions
 */
const FinancialCard: React.FC<FinancialCardProps> = ({ title, value, change, label }) => {
  return (
    <div style={{
      background: 'var(--bg)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '1.5rem',
      transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'default',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-1px)';
      e.currentTarget.style.boxShadow = 'var(--shadow)';
      e.currentTarget.style.borderColor = 'var(--accent-border)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
      e.currentTarget.style.borderColor = 'var(--border)';
    }}
    >
      <div style={{ 
        fontSize: '0.875rem', 
        fontWeight: 500, 
        color: 'var(--text)', 
        letterSpacing: '-0.01em' 
      }}>
        {title}
      </div>
      
      <div style={{ 
        display: 'flex', 
        alignItems: 'baseline', 
        gap: '0.75rem' 
      }}>
        <span style={{ 
          fontSize: '1.5rem', 
          fontWeight: 600, 
          fontFamily: 'var(--mono)', 
          color: 'var(--text-h)' 
        }}>
          {value}
        </span>
        
        {change !== undefined && (
          <span style={{ 
            fontSize: '0.75rem', 
            fontFamily: 'var(--mono)',
            fontWeight: 500,
            color: change >= 0 ? 'var(--success)' : 'var(--error)' 
          }}>
            {change >= 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>

      {label && (
        <div style={{ 
          fontSize: '0.75rem', 
          color: 'var(--text)', 
          opacity: 0.7 
        }}>
          {label}
        </div>
      )}
    </div>
  );
};

export default FinancialCard;
