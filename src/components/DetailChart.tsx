import {
  ComposedChart, Line, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import type { DetailPoint } from '../api/stocks';

interface DetailChartProps {
  points: DetailPoint[];
  interval: 'intraday' | 'daily';
}

function fmtXAxis(dateStr: string, interval: 'intraday' | 'daily'): string {
  if (interval === 'intraday') {
    return dateStr.split(' ')[1]?.slice(0, 5) ?? dateStr;
  }
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function fmtVolume(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  return `${(v / 1e3).toFixed(0)}K`;
}

const DetailChart: React.FC<DetailChartProps> = ({ points, interval }) => {
  if (!points.length) {
    return <div className="dc-empty">No data available for this range.</div>;
  }

  const priceMin = Math.min(...points.map(p => p.low)) * 0.998;
  const priceMax = Math.max(...points.map(p => p.high)) * 1.002;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={points} margin={{ top: 4, right: 48, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={d => fmtXAxis(d, interval)}
          tick={{ fontSize: 11, fill: 'var(--text-dim)', fontFamily: 'var(--mono)' }}
          interval="preserveStartEnd"
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          yAxisId="price"
          domain={[priceMin, priceMax]}
          tickFormatter={v => `$${v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          tick={{ fontSize: 11, fill: 'var(--text-dim)', fontFamily: 'var(--mono)' }}
          axisLine={false}
          tickLine={false}
          width={56}
          orientation="right"
        />
        <YAxis
          yAxisId="volume"
          tickFormatter={fmtVolume}
          tick={{ fontSize: 10, fill: 'var(--text-dim)', fontFamily: 'var(--mono)' }}
          axisLine={false}
          tickLine={false}
          width={44}
          orientation="left"
        />
        <Tooltip
          contentStyle={{ background: 'var(--surface-high)', border: '1px solid var(--border-strong)', borderRadius: 6, fontSize: 12 }}
          labelStyle={{ color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}
          itemStyle={{ color: 'var(--text-h)' }}
          labelFormatter={d => fmtXAxis(d, interval)}
          formatter={(val: number, name: string) => [
            name === 'volume' ? fmtVolume(val) : `$${val.toFixed(2)}`,
            name === 'close' ? 'Close' : name === 'volume' ? 'Volume' : name,
          ]}
        />
        <Bar yAxisId="volume" dataKey="volume" fill="var(--primary)" opacity={0.25} radius={[1, 1, 0, 0]} isAnimationActive={false} />
        <Line
          yAxisId="price"
          type="monotone"
          dataKey="close"
          stroke="var(--primary)"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3, fill: 'var(--primary)' }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default DetailChart;
