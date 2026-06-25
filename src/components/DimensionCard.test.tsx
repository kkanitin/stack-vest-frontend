import { render, screen } from '@testing-library/react';
import DimensionCard from './DimensionCard';
import type { AnalysisDimension } from '../api/portfolios';

function dim(overrides: Partial<AnalysisDimension> = {}): AnalysisDimension {
  return { name: 'Risk', score: 5, rating: 'MID', sentiment: 'neutral', note: 'a note', ...overrides };
}

describe('DimensionCard', () => {
  it('renders name, score (/10), rating badge and note', () => {
    const { container } = render(
      <DimensionCard dimension={dim({ name: 'Yield Efficiency', score: 4.5, rating: 'SUB-OPTIMAL', note: 'Low yield', sentiment: 'neutral' })} />
    );
    expect(screen.getByText('Yield Efficiency')).toBeInTheDocument();
    expect(screen.getByText('SUB-OPTIMAL')).toBeInTheDocument();
    expect(screen.getByText('Low yield')).toBeInTheDocument();
    expect(container.querySelector('.dc-score')!.textContent).toContain('4.5');
    expect(container.querySelector('.dc-unit')!.textContent).toBe('/10');
  });

  it('drives color + icon from sentiment, NOT the score (high score + caution = danger)', () => {
    const { container } = render(<DimensionCard dimension={dim({ score: 9.4, sentiment: 'caution', rating: 'HIGH' })} />);
    expect(container.querySelector('.dc-score')!.className).toContain('dc-score--error');
    expect(screen.getByText('⚠')).toBeInTheDocument();
  });

  it('positive sentiment → success color + ↗ icon', () => {
    const { container } = render(<DimensionCard dimension={dim({ score: 2.0, sentiment: 'positive' })} />);
    expect(container.querySelector('.dc-score')!.className).toContain('dc-score--success');
    expect(screen.getByText('↗')).toBeInTheDocument();
  });

  it('neutral sentiment → neutral color + → icon', () => {
    const { container } = render(<DimensionCard dimension={dim({ sentiment: 'neutral' })} />);
    expect(container.querySelector('.dc-score')!.className).toContain('dc-score--neutral');
    expect(screen.getByText('→')).toBeInTheDocument();
  });
});
