import { useLayoutEffect, useRef, useState } from 'react';
import { useCompanyProfile } from '../hooks/useCompanyProfile';
import AssetPriceChart from './AssetPriceChart';
import Button from './ui/Button';
import Modal from './ui/Modal';
import type { CompanyProfile } from '../api/stocks';
import './AssetDetailModal.css';

interface AssetDetailModalProps {
  symbol: string | null;
  onClose: () => void;
}

function fmtCompact(value: number, currency: string): string {
  if (!value) return '—';
  const abs = Math.abs(value);
  const unit =
    abs >= 1e12 ? ['T', 1e12] :
    abs >= 1e9 ? ['B', 1e9] :
    abs >= 1e6 ? ['M', 1e6] :
    abs >= 1e3 ? ['K', 1e3] : ['', 1];
  const num = (value / (unit[1] as number)).toFixed(unit[0] ? 2 : 0);
  return `${fmtCurrencySymbol(currency)}${num}${unit[0]}`;
}

function fmtCurrencySymbol(currency: string): string {
  switch (currency) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'JPY': return '¥';
    default: return '';
  }
}

function fmtPrice(value: number, currency: string): string {
  if (!value) return '—';
  return `${fmtCurrencySymbol(currency)}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtEmployees(raw: string): string | null {
  const n = Number(raw);
  if (!raw || Number.isNaN(n) || n <= 0) return null;
  return n.toLocaleString('en-US');
}

interface Stat {
  label: string;
  value: string;
}

function buildStats(p: CompanyProfile): Stat[] {
  const stats: Stat[] = [];
  if (p.price) stats.push({ label: 'Price', value: fmtPrice(p.price, p.currency) });
  if (p.marketCap) stats.push({ label: 'Market Cap', value: fmtCompact(p.marketCap, p.currency) });
  if (p.beta) stats.push({ label: 'Beta', value: p.beta.toFixed(2) });
  const employees = fmtEmployees(p.fullTimeEmployees);
  if (employees) stats.push({ label: 'Employees', value: employees });
  if (p.ipoDate) stats.push({ label: 'IPO Date', value: p.ipoDate });
  return stats;
}

function buildMeta(p: CompanyProfile): Stat[] {
  const meta: Stat[] = [];
  if (p.sector) meta.push({ label: 'Sector', value: p.sector });
  if (p.industry) meta.push({ label: 'Industry', value: p.industry });
  if (p.country) meta.push({ label: 'Country', value: p.country });
  if (p.ceo) meta.push({ label: 'CEO', value: p.ceo });
  return meta;
}

const ProfileBody: React.FC<{ profile: CompanyProfile }> = ({ profile: p }) => {
  const stats = buildStats(p);
  const meta = buildMeta(p);
  const exchange = p.exchangeFullName || p.exchange;

  const descRef = useRef<HTMLParagraphElement>(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const [descClamped, setDescClamped] = useState(false);

  // Only offer the toggle when the collapsed text is actually being truncated
  // (full content taller than the 5-line clamp). Re-measure per description.
  useLayoutEffect(() => {
    setDescExpanded(false);
    const el = descRef.current;
    if (el) setDescClamped(el.scrollHeight > el.clientHeight + 1);
  }, [p.description]);

  return (
    <div className="adm-profile">
      <div className="adm-profile-head">
        {p.image && (
          <img
            className="adm-logo"
            src={p.image}
            alt=""
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
        )}
        <div className="adm-profile-headtext">
          <div className="adm-badges">
            {exchange && <span className="adm-tag">{exchange}</span>}
            {p.isEtf && <span className="adm-tag adm-tag--accent">ETF</span>}
            <span className={`adm-tag ${p.isActivelyTrading ? 'adm-tag--ok' : 'adm-tag--muted'}`}>
              {p.isActivelyTrading ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      {stats.length > 0 && (
        <div className="adm-stats">
          {stats.map(s => (
            <div key={s.label} className="adm-stat">
              <span className="adm-stat-label">{s.label}</span>
              <span className="adm-stat-value">{s.value}</span>
            </div>
          ))}
        </div>
      )}

      <AssetPriceChart symbol={p.symbol} currency={p.currency} />

      {meta.length > 0 && (
        <dl className="adm-meta">
          {meta.map(m => (
            <div key={m.label} className="adm-meta-row">
              <dt className="adm-meta-label">{m.label}</dt>
              <dd className="adm-meta-value">{m.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {p.description && (
        <div className="adm-desc-wrap">
          <p
            ref={descRef}
            className={`adm-desc${descExpanded ? ' adm-desc--expanded' : ''}`}
          >
            {p.description}
          </p>
          {descClamped && (
            <button
              type="button"
              className="adm-desc-toggle"
              aria-expanded={descExpanded}
              onClick={() => setDescExpanded(v => !v)}
            >
              {descExpanded ? 'View less' : 'View more'}
            </button>
          )}
        </div>
      )}

      {p.website && (
        <a className="adm-website" href={p.website} target="_blank" rel="noopener noreferrer">
          {p.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
        </a>
      )}
    </div>
  );
};

const AssetDetailModal: React.FC<AssetDetailModalProps> = ({ symbol, onClose }) => {
  const { data, isLoading, isError, refetch } = useCompanyProfile(symbol);

  return (
    <Modal
      open={!!symbol}
      onClose={onClose}
      maxWidth={880}
      ariaLabel={`Company profile — ${symbol ?? ''}`}
      title={
        <div className="adm-title-wrap">
          <span className="adm-symbol">{symbol}</span>
          {data?.companyName && <span className="adm-name">{data.companyName}</span>}
          {data?.currency && <span className="adm-currency">{data.currency}</span>}
        </div>
      }
    >
      <div className="adm-body">
        {isLoading ? (
          <div className="adm-skel" />
        ) : isError ? (
          <div className="adm-error">
            <span>Failed to load profile.</span>
            <Button variant="outline" onClick={() => refetch()}>Retry</Button>
          </div>
        ) : data ? (
          <ProfileBody profile={data} />
        ) : null}
      </div>
    </Modal>
  );
};

export default AssetDetailModal;
