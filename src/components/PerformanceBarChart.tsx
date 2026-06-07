import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { intensity } from '../utils/perfColor';
import type { WatchlistEntry } from '../hooks/useWatchlistQuotes';
import type { StockPriceChange } from '../api/stocks';

type Period = '1D' | '1W' | '1M' | 'YTD';
type NumericKey = Exclude<keyof StockPriceChange, 'symbol'>;

const PERIOD_KEY: Record<Period, NumericKey> = {
  '1D': '1D',
  '1W': '5D',
  '1M': '1M',
  'YTD': 'ytd',
};

interface BarEntry { symbol: string; value: number }

interface PerformanceBarChartProps {
  entries: WatchlistEntry[];
  period: Period;
}

const PerformanceBarChart: React.FC<PerformanceBarChartProps> = ({ entries, period }) => {
  const sortedData = useMemo<BarEntry[]>(() => {
    return entries
      .flatMap(e => e.priceChange
        ? [{ symbol: e.item.symbol, value: e.priceChange[PERIOD_KEY[period]] }]
        : []
      )
      .sort((a, b) => b.value - a.value);
  }, [entries, period]);

  if (!sortedData.length) {
    return (
      <div className="pbc-empty">
        {entries.length === 0
          ? 'Add assets to your watchlist to see performance rankings.'
          : 'No performance data available for this period.'}
      </div>
    );
  }

  const chartHeight = Math.max(sortedData.length * 36 + 48, 120);

  return (
    <div className="pbc-wrap">
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          layout="vertical"
          data={sortedData}
          margin={{ top: 4, right: 48, bottom: 4, left: 0 }}
        >
          <XAxis
            type="number"
            tickFormatter={v => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`}
            tick={{ fontSize: 11, fill: 'var(--text-dim)', fontFamily: 'var(--mono)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="symbol"
            width={52}
            tick={{ fontSize: 12, fill: 'var(--text-h)', fontFamily: 'var(--mono)', fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: 'var(--surface-high)' }}
            contentStyle={{ background: 'var(--surface-high)', border: '1px solid var(--border-strong)', borderRadius: 6, fontSize: 12 }}
            formatter={(v: number) => [`${v > 0 ? '+' : ''}${v.toFixed(2)}%`, period]}
          />
          <Bar dataKey="value" radius={[0, 3, 3, 0]} isAnimationActive={false}>
            {sortedData.map((d, i) => {
              const alpha = intensity(d.value);
              const fill = d.value >= 0
                ? `rgba(74,222,128,${alpha})`
                : `rgba(255,180,171,${alpha})`;
              return <Cell key={`cell-${i}`} fill={fill} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PerformanceBarChart;
