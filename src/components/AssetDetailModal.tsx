import { useState, useEffect } from 'react';
import { useDetailData } from '../hooks/useDetailData';
import DetailChart from './DetailChart';
import SegmentedControl from './ui/SegmentedControl';
import Button from './ui/Button';
import Modal from './ui/Modal';
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

  const { data, isLoading, isError, refetch } = useDetailData(symbol, range);

  return (
    <Modal
      open={!!symbol}
      onClose={onClose}
      maxWidth={660}
      ariaLabel={`Asset detail — ${symbol ?? ''}`}
      title={
        <div className="adm-title-wrap">
          <span className="adm-symbol">{symbol}</span>
          {data && <span className="adm-name">{data.name}</span>}
          {data && <span className="adm-currency">{data.currency}</span>}
        </div>
      }
    >
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
    </Modal>
  );
};

export default AssetDetailModal;
