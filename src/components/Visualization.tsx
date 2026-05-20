import React from 'react';
import { useAuth } from '../context/AuthContext';
import Card from './ui/Card';
import Badge from './ui/Badge';
import './Visualization.css';

// TODO(mock): allocation, top assets, and recent activity rows are placeholder
// until backend endpoints exist. Every literal below should be sourced from a
// real feed once available.

interface AllocationSlice {
  symbol: string;
  pct: number;
  color: string;
}

const ALLOCATION: AllocationSlice[] = [
  { symbol: 'BTC', pct: 52, color: '#a1ced9' },
  { symbol: 'ETH', pct: 26, color: '#2d5a64' },
  { symbol: 'SOL', pct: 14, color: '#f2bb95' },
  { symbol: 'USDC', pct: 8, color: '#4ade80' },
];

interface TopAsset {
  symbol: string;
  name: string;
  balance: string;
  value: string;
  change: number;
}

const TOP_ASSETS: TopAsset[] = [
  { symbol: 'BTC', name: 'Bitcoin', balance: '0.1842', value: '$12,768.42', change: 2.34 },
  { symbol: 'ETH', name: 'Ethereum', balance: '2.4501', value: '$6,395.10', change: 1.12 },
  { symbol: 'SOL', name: 'Solana', balance: '24.18', value: '$3,425.20', change: -0.84 },
  { symbol: 'USDC', name: 'USD Coin', balance: '1,971.40', value: '$1,971.40', change: 0.0 },
];

interface ActivityItem {
  label: string;
  detail: string;
  tone: 'success' | 'warning' | 'primary';
  badge: string;
}

const ACTIVITY: ActivityItem[] = [
  { label: 'BTC purchase', detail: 'Recurring DCA · 2h ago', tone: 'success', badge: '+$500' },
  { label: 'ETH rebalance', detail: 'Manual · 1d ago', tone: 'primary', badge: '+0.45' },
  { label: 'Market volatility', detail: 'Alert · 3d ago', tone: 'warning', badge: 'High' },
];

function Donut({ slices }: { slices: AllocationSlice[] }) {
  const radius = 60;
  const stroke = 18;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <svg viewBox="0 0 160 160" className="viz-donut" role="img" aria-label="Allocation donut">
      <circle cx="80" cy="80" r={radius} fill="none" stroke="var(--surface-highest)" strokeWidth={stroke} />
      {slices.map(s => {
        const length = (s.pct / 100) * circumference;
        const circle = (
          <circle
            key={s.symbol}
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            strokeDasharray={`${length} ${circumference - length}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 80 80)"
            strokeLinecap="butt"
          />
        );
        offset += length;
        return circle;
      })}
      <text x="80" y="74" textAnchor="middle" className="viz-donut-num">
        {slices.length}
      </text>
      <text x="80" y="92" textAnchor="middle" className="viz-donut-lbl">
        ASSETS
      </text>
    </svg>
  );
}

function fmtPct(n: number): string {
  const sign = n > 0 ? '+' : n < 0 ? '' : '';
  return `${sign}${n.toFixed(2)}%`;
}

const Visualization: React.FC = () => {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] ?? 'Investor';

  return (
    <div className="viz">
      <header className="viz-head">
        <h1 className="viz-greeting">Welcome back, {firstName}.</h1>
        <p className="viz-sub">A snapshot of your portfolio and market activity.</p>
      </header>

      <div className="viz-row viz-row--3">
        <Card label="Total Portfolio Value" className="viz-card">
          {/* TODO(mock): portfolio total — replace with real /portfolio endpoint */}
          <div className="viz-value">$24,560.12</div>
          <div className="viz-card-meta">
            <Badge tone="success" mono>+12.4%</Badge>
            <span className="viz-card-meta-sub">+$2,720.00 · 30d</span>
          </div>
        </Card>

        <Card label="Market Status" className="viz-card">
          <div className="viz-card-title">Bullish Sentiment</div>
          <p className="viz-card-body">
            BTC and ETH showing sustained recovery in the last 24h with healthy volume.
            Tracked majors holding above their weekly resistance.
          </p>
          <Badge tone="primary">Live</Badge>
        </Card>

        <Card label="Recent Activity" className="viz-card">
          <ul className="viz-activity">
            {ACTIVITY.map(a => (
              <li key={a.label} className="viz-activity-row">
                <div className="viz-activity-text">
                  <span className="viz-activity-name">{a.label}</span>
                  <span className="viz-activity-detail">{a.detail}</span>
                </div>
                <Badge tone={a.tone} mono>{a.badge}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="viz-row viz-row--allocation">
        <Card label="Allocation" className="viz-card viz-card--allocation">
          <div className="viz-allocation">
            <Donut slices={ALLOCATION} />
            <ul className="viz-legend">
              {ALLOCATION.map(s => (
                <li key={s.symbol} className="viz-legend-row">
                  <span className="viz-legend-swatch" style={{ background: s.color }} />
                  <span className="viz-legend-symbol">{s.symbol}</span>
                  <span className="viz-legend-pct">{s.pct}%</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card label="Top Assets" className="viz-card viz-card--top">
          <div className="viz-table-wrap">
            <table className="viz-table">
              <thead>
                <tr>
                  <th className="viz-th">Asset</th>
                  <th className="viz-th viz-th--right">Balance</th>
                  <th className="viz-th viz-th--right">Value (USD)</th>
                  <th className="viz-th viz-th--right">24h</th>
                </tr>
              </thead>
              <tbody>
                {TOP_ASSETS.map(a => {
                  const cls = a.change > 0 ? 'positive' : a.change < 0 ? 'negative' : 'neutral';
                  return (
                    <tr key={a.symbol} className="viz-tr">
                      <td className="viz-td">
                        <div className="viz-asset">
                          <span className="viz-asset-symbol">{a.symbol}</span>
                          <span className="viz-asset-name">{a.name}</span>
                        </div>
                      </td>
                      <td className="viz-td viz-td--mono viz-td--right">{a.balance}</td>
                      <td className="viz-td viz-td--mono viz-td--right">{a.value}</td>
                      <td className={`viz-td viz-td--mono viz-td--right viz-change ${cls}`}>{fmtPct(a.change)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Visualization;
