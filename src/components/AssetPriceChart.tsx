import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useStockHistory } from '../hooks/useStockHistory';
import type { HistoryRange } from '../hooks/useStockHistory';
import { Button } from '@/components/ui/button';
import './AssetPriceChart.css';

const RANGES: HistoryRange[] = ['1M', '3M', '6M', '1Y'];

interface AssetPriceChartProps {
  symbol: string;
  currency: string;
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function currencySymbol(currency: string): string {
  switch (currency) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'JPY': return '¥';
    default: return '';
  }
}

const AssetPriceChart: React.FC<AssetPriceChartProps> = ({ symbol, currency }) => {
  const [range, setRange] = useState<HistoryRange>('3M');
  const { data, isLoading, isError, refetch } = useStockHistory(symbol, range);

  const points = data?.points ?? [];
  const positive =
    points.length >= 2 ? points[points.length - 1].close >= points[0].close : true;
  const sym = currencySymbol(currency);
  const fmtAxis = (v: number) => `${sym}${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  const fmtTooltip = (v: number) =>
    `${sym}${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <section className="apc" aria-label="Price history">
      <header className="apc-head">
        <span className="apc-title">Price</span>
        <div className="apc-ranges" role="group" aria-label="Chart time range">
          {RANGES.map(r => (
            <button
              key={r}
              type="button"
              className={`apc-range${r === range ? ' apc-range--on' : ''}`}
              aria-pressed={r === range}
              onClick={() => setRange(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </header>

      <div className={`apc-chart ${positive ? 'apc-chart--up' : 'apc-chart--down'}`}>
        {isLoading ? (
          <div className="apc-skel" />
        ) : isError ? (
          <div className="apc-error">
            <span>Price data unavailable.</span>
            <Button variant="outline" onClick={() => refetch()}>Retry</Button>
          </div>
        ) : points.length < 2 ? (
          <div className="apc-empty">No price history for this asset.</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={fmtDate}
                tick={{ fontSize: 11, fill: 'var(--text-dim)', fontFamily: 'var(--mono)' }}
                interval="preserveStartEnd"
                minTickGap={32}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={fmtAxis}
                tick={{ fontSize: 11, fill: 'var(--text-dim)', fontFamily: 'var(--mono)' }}
                axisLine={false}
                tickLine={false}
                width={48}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--surface-high)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 6,
                  fontSize: 12,
                  fontFamily: 'var(--mono)',
                }}
                labelFormatter={fmtDate}
                formatter={(v: number) => [fmtTooltip(v), 'Close']}
              />
              <Line
                type="monotone"
                dataKey="close"
                stroke="currentColor"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3, stroke: 'currentColor', fill: 'currentColor' }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
};

export default AssetPriceChart;
