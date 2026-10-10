import { render, screen, fireEvent, within } from '@testing-library/react';
import DcaGrowthChart from './DcaGrowthChart';

const points = [
  { date: '2024-01-02', invested: 100, value: 100 },
  { date: '2024-02-01', invested: 200, value: 230 },
  { date: '2024-03-01', invested: 300, value: 390 },
];

function renderChart(width = 800) {
  render(<DcaGrowthChart points={points} width={width} height={260} />);
  const svg = screen.getByRole('img');
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, right: width, bottom: 260, width, height: 260, x: 0, y: 0, toJSON: () => ({}) });
  return svg;
}

describe('DcaGrowthChart', () => {
  it('has a text alternative that states the final value', () => {
    const svg = renderChart();
    expect(svg.getAttribute('aria-label')).toContain('final value $390');
  });

  it('draws dates along the horizontal axis', () => {
    renderChart();
    expect(screen.getByText('Jan 2')).toBeInTheDocument();
    expect(screen.getByText('Mar 1')).toBeInTheDocument();
  });

  it('uses fewer axis labels at phone width', () => {
    renderChart(360);
    expect(screen.getAllByText(/^[A-Z][a-z]{2} \d+$/)).toHaveLength(3);
  });

  it('shows date, value and invested at the nearest point on hover, and hides on leave', () => {
    const svg = renderChart();
    expect(screen.queryByText('Mar 1, 2024')).not.toBeInTheDocument();

    fireEvent.pointerMove(svg, { clientX: 790 }); // far right → last point
    const tip = within(document.querySelector('.dca-chart-tip') as HTMLElement);
    expect(tip.getByText('Mar 1, 2024')).toBeInTheDocument();
    expect(tip.getByText('$390')).toBeInTheDocument();
    expect(tip.getByText('$300')).toBeInTheDocument();

    fireEvent.pointerLeave(svg);
    expect(screen.queryByText('Mar 1, 2024')).not.toBeInTheDocument();
  });

  it('shows the readout on tap', () => {
    const svg = renderChart();
    fireEvent.pointerDown(svg, { clientX: 48 }); // far left → first point
    expect(screen.getByText('Jan 2, 2024')).toBeInTheDocument();
  });
});
