import { render, screen, fireEvent, within } from '@testing-library/react';
import GoalGrowthChart from './GoalGrowthChart';
import type { GoalChartPoint } from '../utils/goalChart';

const points: GoalChartPoint[] = [
  { year: 0, invested: 1000, value: { low: 1000, expected: 1000, high: 1000 } },
  { year: 1, invested: 2200, value: { low: 2250, expected: 2300, high: 2350 } },
  { year: 2, invested: 3400, value: { low: 3550, expected: 3700, high: 3850 } },
  { year: 3, invested: 4600, value: { low: 4900, expected: 5150, high: 5400 } },
];
const returns = { low: 6, expected: 8, high: 10 };

function renderChart({ width = 800, target }: { width?: number; target?: number } = {}) {
  render(
    <GoalGrowthChart points={points} returns={returns} currency="THB" target={target} width={width} height={260} />,
  );
  const svg = screen.getByRole('img');
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, right: width, bottom: 260, width, height: 260, x: 0, y: 0, toJSON: () => ({}) });
  return svg;
}

const tip = () => within(document.querySelector('.goal-chart-tip') as HTMLElement);

describe('GoalGrowthChart', () => {
  it('has a text alternative with the years, amount invested and expected final value', () => {
    const svg = renderChart();
    expect(svg.getAttribute('aria-label')).toBe(
      'Goal growth over 3 years. Amount invested 4,600 THB; expected final value 5,150 THB (low 4,900 THB, high 5,400 THB).',
    );
  });

  it('mentions the target in the text alternative and draws its line', () => {
    const svg = renderChart({ target: 6000 });
    expect(svg.getAttribute('aria-label')).toContain('Target 6,000 THB.');
    expect(screen.getByTestId('goal-chart-target')).toBeInTheDocument();
  });

  it('draws no target line without a target', () => {
    renderChart();
    expect(screen.queryByTestId('goal-chart-target')).not.toBeInTheDocument();
  });

  it('labels years along the horizontal axis, fewer at phone width', () => {
    renderChart();
    expect(screen.getByText('Now')).toBeInTheDocument();
    expect(screen.getAllByText(/^Year \d+$/)).toHaveLength(3);
  });

  it('uses fewer year labels at phone width', () => {
    renderChart({ width: 360 });
    expect(screen.getAllByText(/^(Now|Year \d+)$/).length).toBeLessThanOrEqual(3);
  });

  it('shows year, invested and low / expected / high values on hover, and hides on leave', () => {
    const svg = renderChart();
    expect(document.querySelector('.goal-chart-tip')).toBeNull();

    fireEvent.pointerMove(svg, { clientX: 790 }); // far right → last point
    expect(tip().getByText('Year 3')).toBeInTheDocument();
    expect(tip().getByText('4,600 THB')).toBeInTheDocument();
    expect(tip().getByText('Low (6%)')).toBeInTheDocument();
    expect(tip().getByText('4,900 THB')).toBeInTheDocument();
    expect(tip().getByText('Expected (8%)')).toBeInTheDocument();
    expect(tip().getByText('5,150 THB')).toBeInTheDocument();
    expect(tip().getByText('High (10%)')).toBeInTheDocument();
    expect(tip().getByText('5,400 THB')).toBeInTheDocument();

    fireEvent.pointerLeave(svg);
    expect(document.querySelector('.goal-chart-tip')).toBeNull();
  });

  it('shows the readout on tap and keeps it when the finger lifts', () => {
    const svg = renderChart();
    fireEvent.pointerDown(svg, { clientX: 48 }); // far left → year 0
    expect(tip().getByText('Now')).toBeInTheDocument();
    fireEvent.pointerLeave(svg, { pointerType: 'touch' });
    expect(document.querySelector('.goal-chart-tip')).not.toBeNull();
  });
});
