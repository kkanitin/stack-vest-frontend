import React from 'react';
import './DcaSkippedNotice.css';

interface SkippedItem {
  symbol: string;
  reason: string;
}

interface Props {
  skipped: SkippedItem[];
  /** Lead-in before the list. */
  title?: string;
}

/** Names the assets left out of a multi-asset result and why. Renders nothing when none were. */
const DcaSkippedNotice: React.FC<Props> = ({ skipped, title = 'Left out of the comparison:' }) => {
  if (skipped.length === 0) return null;
  return (
    <div className="dca-skipped" role="status">
      <strong>{title}</strong>
      <ul>
        {skipped.map(s => (
          <li key={s.symbol}><span className="dca-skipped-symbol">{s.symbol}</span> — {s.reason}</li>
        ))}
      </ul>
    </div>
  );
};

export default DcaSkippedNotice;
