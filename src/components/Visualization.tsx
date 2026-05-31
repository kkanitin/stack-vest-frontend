import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Card from './ui/Card';
import Badge from './ui/Badge';
import {
  getPortfolioSummary,
  getPortfolioPositions,
  getPortfolioActivity,
} from '../api/portfolio';
import type { PortfolioSummary, PortfolioPosition, PortfolioActivity } from '../api/portfolio';
import './Visualization.css';

const COLORS = ['#a1ced9', '#2d5a64', '#f2bb95', '#4ade80', '#f87171', '#a78bfa', '#fb923c', '#38bdf8'];

const TONE_MAP = {
  positive: 'success',
  negative: 'error',
  neutral: 'neutral',
} as const satisfies Record<string, 'success' | 'error' | 'neutral'>;

interface AllocationSlice {
  symbol: string;
  pct: number;
  color: string;
}

function deriveAllocation(positions: PortfolioPosition[]): AllocationSlice[] {
  const total = positions.reduce((s, p) => s + p.valueUsd, 0);
  if (total === 0) return [];
  return positions.map((p, i) => ({
    symbol: p.symbol,
    pct: (p.valueUsd / total) * 100,
    color: COLORS[i % COLORS.length],
  }));
}

function fmtMoney(n: number): string {
  return `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtShares(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 8 });
}

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

const Visualization: React.FC = () => {
  const { user, token } = useAuth();
  const firstName = user?.name?.split(' ')[0] ?? 'Investor';

  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [positions, setPositions] = useState<PortfolioPosition[] | null>(null);
  const [activity, setActivity] = useState<PortfolioActivity[] | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingPositions, setLoadingPositions] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoadingSummary(false);
      setLoadingPositions(false);
      setLoadingActivity(false);
      return;
    }
    getPortfolioSummary(token)
      .then(setSummary)
      .catch(console.error)
      .finally(() => setLoadingSummary(false));
    getPortfolioPositions(token)
      .then(setPositions)
      .catch(console.error)
      .finally(() => setLoadingPositions(false));
    getPortfolioActivity(token)
      .then(setActivity)
      .catch(console.error)
      .finally(() => setLoadingActivity(false));
  }, [token]);

  const allocation = positions ? deriveAllocation(positions) : [];
  const hasPositions = !loadingPositions && positions !== null && positions.length > 0;
  const isEmpty = !loadingPositions && positions !== null && positions.length === 0;

  return (
    <div className="viz">
      <header className="viz-head">
        <h1 className="viz-greeting">Welcome back, {firstName}.</h1>
        <p className="viz-sub">A snapshot of your portfolio and market activity.</p>
      </header>

      <div className="viz-row viz-row--3">
        {/* D-1: Total Portfolio Value */}
        <Card label="Total Portfolio Value" className="viz-card">
          {loadingSummary ? (
            <div className="viz-skel viz-skel--value" />
          ) : summary ? (
            <>
              <div className="viz-value">{fmtMoney(summary.totalValue)}</div>
              <div className="viz-card-meta">
                <Badge tone={summary.changePct30d >= 0 ? 'success' : 'error'} mono>
                  {fmtPct(summary.changePct30d)}
                </Badge>
                <span className="viz-card-meta-sub">
                  {summary.change30d >= 0 ? '+' : '-'}{fmtMoney(summary.change30d)} · 30d
                </span>
              </div>
            </>
          ) : (
            <div className="viz-value viz-value--dim">—</div>
          )}
        </Card>

        <Card label="Market Status" className="viz-card">
          <div className="viz-card-title">Bullish Sentiment</div>
          <p className="viz-card-body">
            S&P 500 and NASDAQ showing sustained momentum with healthy volume.
            Tracked majors holding above their weekly support levels.
          </p>
          <Badge tone="primary">Live</Badge>
        </Card>

        {/* D-3: Recent Activity */}
        <Card label="Recent Activity" className="viz-card">
          {loadingActivity ? (
            <ul className="viz-activity">
              {[0, 1, 2].map(i => (
                <li key={i} className="viz-activity-row">
                  <div className="viz-skel viz-skel--activity" />
                </li>
              ))}
            </ul>
          ) : activity && activity.length > 0 ? (
            <ul className="viz-activity">
              {activity.map(a => (
                <li key={a.id} className="viz-activity-row">
                  <div className="viz-activity-text">
                    <span className="viz-activity-name">{a.label}</span>
                    <span className="viz-activity-detail">{a.detail}</span>
                  </div>
                  <Badge tone={TONE_MAP[a.tone] ?? 'neutral'} mono>{a.badge}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="viz-empty-text">No activity yet.</p>
          )}
        </Card>
      </div>

      {/* D-2: Allocation donut + Top Assets table */}
      {loadingPositions && (
        <div className="viz-row viz-row--allocation">
          <Card label="Allocation" className="viz-card viz-card--allocation">
            <div className="viz-skel viz-skel--donut" />
          </Card>
          <Card label="Top Assets" className="viz-card viz-card--top">
            <div className="viz-table-wrap">
              {[0, 1, 2, 4].map(i => (
                <div key={i} className="viz-skel viz-skel--row" />
              ))}
            </div>
          </Card>
        </div>
      )}

      {hasPositions && (
        <div className="viz-row viz-row--allocation">
          <Card label="Allocation" className="viz-card viz-card--allocation">
            <div className="viz-allocation">
              <Donut slices={allocation} />
              <ul className="viz-legend">
                {allocation.map(s => (
                  <li key={s.symbol} className="viz-legend-row">
                    <span className="viz-legend-swatch" style={{ background: s.color }} />
                    <span className="viz-legend-symbol">{s.symbol}</span>
                    <span className="viz-legend-pct">{s.pct.toFixed(1)}%</span>
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
                  {positions!
                    .slice()
                    .sort((a, b) => b.valueUsd - a.valueUsd)
                    .map(a => {
                      const cls = a.change24h > 0 ? 'positive' : a.change24h < 0 ? 'negative' : 'neutral';
                      return (
                        <tr key={a.symbol} className="viz-tr">
                          <td className="viz-td">
                            <div className="viz-asset">
                              <span className="viz-asset-symbol">{a.symbol}</span>
                              <span className="viz-asset-name">{a.name}</span>
                            </div>
                          </td>
                          <td className="viz-td viz-td--mono viz-td--right">{fmtShares(a.shares)}</td>
                          <td className="viz-td viz-td--mono viz-td--right">{fmtMoney(a.valueUsd)}</td>
                          <td className={`viz-td viz-td--mono viz-td--right viz-change ${cls}`}>{fmtPct(a.change24h)}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {isEmpty && (
        <Card label="Portfolio" className="viz-card viz-card--empty">
          <p className="viz-empty-text">You have no positions yet.</p>
          <Link to="/dashboard/watchlist" className="viz-empty-cta">
            Add assets to your watchlist →
          </Link>
        </Card>
      )}
    </div>
  );
};

export default Visualization;
