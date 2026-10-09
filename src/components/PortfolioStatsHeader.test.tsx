import { render, screen } from '@testing-library/react';
import PortfolioStatsHeader from './PortfolioStatsHeader';
import type { PortfoliosSummary } from '../api/portfolios';

function renderHeader(changePct: number) {
  const summary: PortfoliosSummary = { totalValue: 1000, changePct, realisedPnl: 0, unrealisedPnl: 0, diversificationScore: 50 };
  return render(<PortfolioStatsHeader activeCount={2} summary={summary} summaryLoading={false} />);
}

describe('PortfolioStatsHeader change figure', () => {
  it('colours a gain as a gain', () => {
    renderHeader(4.26);
    expect(screen.getByText('+4.3%')).toHaveClass('pf-stat-delta--positive');
  });

  it('colours a loss as a loss', () => {
    renderHeader(-4.26);
    expect(screen.getByText('-4.3%')).toHaveClass('pf-stat-delta--negative');
  });

  it('shows a change that displays as zero as neutral and unsigned', () => {
    renderHeader(-0.04);
    expect(screen.getByText('0.0%')).toHaveClass('pf-stat-delta--neutral');
  });
});
