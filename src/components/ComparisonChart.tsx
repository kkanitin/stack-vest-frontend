import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { normalizeBase100 } from '../utils/normalizeBase100';
import { useComparisonData } from '../hooks/useComparisonData';
import Button from './ui/Button';

const LINE_COLORS = ['#a1ced9', '#4ade80', '#f2bb95', '#c084fc', '#f97316', '#38bdf8'];

interface ComparisonChartProps {
  symbols: string[];
  range: '7D' | '30D' | '90D' | '1Y' | 'All';
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

const ComparisonChart: React.FC<ComparisonChartProps> = ({ symbols, range }) => {
  const { data, isLoading, isError, refetch } = useComparisonData(symbols, range);

  const chartData = useMemo(() => {
    if (!data || !symbols.length) return [];
    const dateMap = new Map<string, Record<string, string | number>>();
    for (const item of data) {
      if (!symbols.includes(item.symbol)) continue;
      const normalized = normalizeBase100(item.points);
      for (const pt of normalized) {
        if (!dateMap.has(pt.date)) dateMap.set(pt.date, { date: pt.date });
        (dateMap.get(pt.date) as Record<string, string | number>)[item.symbol] = +pt.close.toFixed(2);
      }
    }
    return Array.from(dateMap.values()).sort((a, b) =>
      (a.date as string).localeCompare(b.date as string)
    );
  }, [data, symbols]);

  if (!symbols.length) {
    return (
      <div className="cc-empty">
        <p>Select 2+ assets from the List view to compare.</p>
      </div>
    );
  }
  if (symbols.length === 1) {
    return (
      <div className="cc-empty">
        <p>Add at least one more asset to see a comparison.</p>
      </div>
    );
  }
  if (isLoading) {
    return <div className="cc-skel" />;
  }
  if (isError) {
    return (
      <div className="cc-error">
        <span>Failed to load comparison data.</span>
        <Button variant="outline" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={fmtDate}
          tick={{ fontSize: 11, fill: 'var(--text-dim)', fontFamily: 'var(--mono)' }}
          interval="preserveStartEnd"
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={v => `${v.toFixed(0)}`}
          tick={{ fontSize: 11, fill: 'var(--text-dim)', fontFamily: 'var(--mono)' }}
          axisLine={false}
          tickLine={false}
          width={36}
          domain={['auto', 'auto']}
        />
        <Tooltip
          contentStyle={{ background: 'var(--surface-high)', border: '1px solid var(--border-strong)', borderRadius: 6, fontSize: 12 }}
          labelFormatter={fmtDate}
          formatter={(v: number, name: string) => [`${v.toFixed(2)}`, name]}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, fontFamily: 'var(--mono)', paddingTop: 8 }}
        />
        {symbols.map((sym, i) => (
          <Line
            key={sym}
            type="monotone"
            dataKey={sym}
            stroke={LINE_COLORS[i % LINE_COLORS.length]}
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3 }}
            connectNulls
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default ComparisonChart;
