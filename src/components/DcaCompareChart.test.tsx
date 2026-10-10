import { render, screen, fireEvent, within } from '@testing-library/react';
import DcaCompareChart from './DcaCompareChart';
import type { CompareSeries } from '../utils/dcaCompare';

const series: CompareSeries[] = [
  { symbol: 'AAA', color: 'red', points: [{ date: '2024-01-02', pct: 0 }, { date: '2024-03-01', pct: 20 }] },
  { symbol: 'BBB', color: 'blue', points: [{ date: '2024-01-03', pct: 0 }, { date: '2024-03-01', pct: -5 }] },
];

function renderChart(width = 800) {
  render(<DcaCompareChart series={series} width={width} height={260} />);
  const svg = screen.getByRole('img');
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, right: width, bottom: 260, width, height: 260, x: 0, y: 0, toJSON: () => ({}) });
  return svg;
}

describe('DcaCompareChart', () => {
  it('draws one line per asset and dates along the axis', () => {
    renderChart();
    expect(document.querySelectorAll('path')).toHaveLength(2);
    expect(screen.getByText('Jan 2')).toBeInTheDocument();
    expect(screen.getByText('Mar 1')).toBeInTheDocument();
  });

  it('has a text alternative with each asset final return', () => {
    expect(renderChart().getAttribute('aria-label')).toContain('AAA +20.00%, BBB -5.00%');
  });

  it('shows every asset at the hovered date, using a dash before an asset has started', () => {
    const svg = renderChart();
    fireEvent.pointerMove(svg, { clientX: 52 }); // far left → Jan 2, before BBB's first point
    const tip = within(document.querySelector('.dca-chart-tip') as HTMLElement);
    expect(tip.getByText('Jan 2, 2024')).toBeInTheDocument();
    expect(tip.getByText('+0.00%')).toBeInTheDocument();
    expect(tip.getByText('–')).toBeInTheDocument();

    fireEvent.pointerMove(svg, { clientX: 790 }); // far right → Mar 1
    const end = within(document.querySelector('.dca-chart-tip') as HTMLElement);
    expect(end.getByText('+20.00%')).toBeInTheDocument();
    expect(end.getByText('-5.00%')).toBeInTheDocument();

    fireEvent.pointerLeave(svg);
    expect(document.querySelector('.dca-chart-tip')).toBeNull();
  });

  it('shows the readout on tap', () => {
    const svg = renderChart();
    fireEvent.pointerDown(svg, { clientX: 790 });
    expect(document.querySelector('.dca-chart-tip')).not.toBeNull();
  });
});
