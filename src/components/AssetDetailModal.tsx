import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDetailData } from '../hooks/useDetailData';
import DetailChart from './DetailChart';
import SegmentedControl from './ui/SegmentedControl';
import Button from './ui/Button';
import type { Segment } from './ui/SegmentedControl';
import type { DetailRange } from '../api/stocks';
import './AssetDetailModal.css';

const RANGE_SEGS: Segment<DetailRange>[] = [
  { value: '1D', label: '1D' },
  { value: '1W', label: '1W' },
  { value: '1M', label: '1M' },
  { value: '1Y', label: '1Y' },
  { value: 'All', label: 'All' },
];

interface AssetDetailModalProps {
  symbol: string | null;
  onClose: () => void;
}

const AssetDetailModal: React.FC<AssetDetailModalProps> = ({ symbol, onClose }) => {
  const [range, setRange] = useState<DetailRange>('1M');

  // Reset range when a new symbol opens
  useEffect(() => {
    if (symbol) setRange('1M');
  }, [symbol]);

  // Close on Escape
  useEffect(() => {
    if (!symbol) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [symbol, onClose]);

  const { data, isLoading, isError, refetch } = useDetailData(symbol, range);

  if (!symbol) return null;

  return createPortal(
    <div
      className="adm-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal
      aria-label={`Asset detail — ${symbol}`}
    >
      <div className="adm-sheet">
        <div className="adm-header">
          <div className="adm-title-wrap">
            <span className="adm-symbol">{symbol}</span>
            {data && <span className="adm-name">{data.name}</span>}
            {data && <span className="adm-currency">{data.currency}</span>}
          </div>
          <button className="adm-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="adm-range">
          <SegmentedControl
            segments={RANGE_SEGS}
            value={range}
            onChange={v => setRange(v)}
            size="sm"
          />
        </div>

        <div className="adm-chart">
          {isLoading ? (
            <div className="adm-skel" />
          ) : isError ? (
            <div className="adm-error">
              <span>Failed to load data.</span>
              <Button variant="outline" onClick={() => refetch()}>Retry</Button>
            </div>
          ) : data ? (
            <DetailChart points={data.points} interval={data.interval} />
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AssetDetailModal;
