import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Portfolio } from '../api/portfolios';
import './PortfolioCard.css';

function fmtMoney(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtCount(n: number): string {
  return String(n).padStart(2, '0');
}

interface PortfolioCardProps {
  portfolio: Portfolio;
  onEdit: (portfolio: Portfolio) => void;
  onDelete: (portfolio: Portfolio) => void;
}

const PortfolioCard: React.FC<PortfolioCardProps> = ({ portfolio, onEdit, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the kebab menu on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const hasValue = typeof portfolio.value === 'number';
  const hasCount = typeof portfolio.assetCount === 'number';

  return (
    <Link to={`/dashboard/portfolios/${portfolio.id}`} className="pf-card">
      <div className="pf-card-top">
        <div className="pf-card-headings">
          <h3 className="pf-card-name">{portfolio.name}</h3>
          {portfolio.description && <p className="pf-card-desc">{portfolio.description}</p>}
        </div>
        <div className="pf-card-menu" ref={menuRef}>
          <button
            type="button"
            className="pf-card-menu-btn"
            aria-label={`Actions for ${portfolio.name}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={e => {
              stop(e);
              setMenuOpen(o => !o);
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="12" cy="5" r="1.6" />
              <circle cx="12" cy="12" r="1.6" />
              <circle cx="12" cy="19" r="1.6" />
            </svg>
          </button>
          {menuOpen && (
            <div className="pf-card-dropdown" role="menu">
              <button
                type="button"
                role="menuitem"
                className="pf-card-dropdown-item"
                onClick={e => {
                  stop(e);
                  setMenuOpen(false);
                  onEdit(portfolio);
                }}
              >
                Edit
              </button>
              <button
                type="button"
                role="menuitem"
                className="pf-card-dropdown-item pf-card-dropdown-item--danger"
                onClick={e => {
                  stop(e);
                  setMenuOpen(false);
                  onDelete(portfolio);
                }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="pf-card-foot">
        <div className="pf-card-stat">
          <span className="pf-card-stat-label label-caps">Items</span>
          <span className="pf-card-stat-value data-md">
            {hasCount ? `${fmtCount(portfolio.assetCount!)} Assets` : '—'}
          </span>
        </div>
        <div className="pf-card-stat pf-card-stat--right">
          <span className="pf-card-stat-label label-caps">Value</span>
          <span className="pf-card-stat-value pf-card-stat-value--accent data-lg">
            {hasValue ? fmtMoney(portfolio.value!) : '—'}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default PortfolioCard;
