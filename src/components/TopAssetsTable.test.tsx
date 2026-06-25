import { render, screen, fireEvent } from '@testing-library/react';
import TopAssetsTable from './TopAssetsTable';
import type { PortfolioPosition } from '../api/portfolio';

function makePositions(): PortfolioPosition[] {
  return [
    { id: 'p0', symbol: 'BTC', name: 'Bitcoin', shares: 1, avgCost: 100, valueUsd: 200, change24h: 1, addedAt: '' },
    { id: 'p1', symbol: 'ETH', name: 'Ethereum', shares: 2, avgCost: 50, valueUsd: 100, change24h: -1, addedAt: '' },
  ];
}

function manyPositions(n: number): PortfolioPosition[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    symbol: `SYM${i}`,
    name: `Asset ${i}`,
    shares: 1,
    avgCost: 100,
    // Descending value so sort order is stable and predictable.
    valueUsd: (n - i) * 10,
    change24h: 0,
    addedAt: '',
  }));
}

describe('TopAssetsTable', () => {
  it('renders a Delete button per row and calls onDelete with the row symbol', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <TopAssetsTable positions={makePositions()} isLoading={false} onEdit={onEdit} onDelete={onDelete} />
    );

    const deleteButtons = screen.getAllByRole('button', { name: /delete .* position/i });
    expect(deleteButtons).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: /delete BTC position/i }));
    expect(onDelete).toHaveBeenCalledWith('BTC');
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('truncates to 5 rows and expands via "View All Holdings"', () => {
    render(
      <TopAssetsTable positions={manyPositions(7)} isLoading={false} onEdit={vi.fn()} onDelete={vi.fn()} />
    );

    // Only the top 5 rows are visible initially.
    expect(screen.getAllByRole('button', { name: /delete .* position/i })).toHaveLength(5);

    fireEvent.click(screen.getByRole('button', { name: /view all holdings \(7\)/i }));
    expect(screen.getAllByRole('button', { name: /delete .* position/i })).toHaveLength(7);

    fireEvent.click(screen.getByRole('button', { name: /show fewer/i }));
    expect(screen.getAllByRole('button', { name: /delete .* position/i })).toHaveLength(5);
  });
});
