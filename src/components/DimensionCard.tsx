import React from 'react';
import Badge from './ui/Badge';
import type { AnalysisDimension, AnalysisSentiment } from '../api/portfolios';
import './DimensionCard.css';

/**
 * Card color + icon are driven by `sentiment`, NOT by the score value — score
 * direction differs per dimension (a high Risk score is bad, a high Growth score
 * is good), so only sentiment is a reliable signal of good/bad.
 */
const SENTIMENT: Record<AnalysisSentiment, { tone: 'success' | 'neutral' | 'error'; icon: string }> = {
  positive: { tone: 'success', icon: '↗' },
  neutral: { tone: 'neutral', icon: '→' },
  caution: { tone: 'error', icon: '⚠' },
};

const DimensionCard: React.FC<{ dimension: AnalysisDimension }> = ({ dimension }) => {
  const { tone, icon } = SENTIMENT[dimension.sentiment] ?? SENTIMENT.neutral;

  return (
    <div className="dc-card">
      <span className="dc-label">{dimension.name}</span>
      <div className={`dc-score dc-score--${tone}`}>
        {dimension.score.toFixed(1)}
        <span className="dc-unit">/10</span>
      </div>
      {dimension.note && <p className="dc-note">{dimension.note}</p>}
      <div className="dc-foot">
        {dimension.rating && <Badge tone={tone}>{dimension.rating}</Badge>}
        <span className={`dc-icon dc-icon--${tone}`} aria-hidden="true">{icon}</span>
      </div>
    </div>
  );
};

export default DimensionCard;
