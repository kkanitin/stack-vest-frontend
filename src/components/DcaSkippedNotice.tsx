import React from 'react';
import type { DcaSkipped } from '../api/simulations';

/** Names the assets left out of a multi-asset result and why. Renders nothing when none were. */
const DcaSkippedNotice: React.FC<{ skipped: DcaSkipped[] }> = ({ skipped }) => {
  if (skipped.length === 0) return null;
  return (
    <div className="dca-skipped" role="status">
      <strong>Left out of the comparison:</strong>
      <ul>
        {skipped.map(s => (
          <li key={s.symbol}><span className="dca-skipped-symbol">{s.symbol}</span> — {s.reason}</li>
        ))}
      </ul>
    </div>
  );
};

export default DcaSkippedNotice;
