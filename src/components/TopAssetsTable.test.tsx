import { render, screen, fireEvent } from '@testing-library/react';
import TopAssetsTable from './TopAssetsTable';
import type { PortfolioPosition } from '../api/portfolio';

function makePositions(): PortfolioPosition[] {
  return [
    { id: 'p0', symbol: 'BTC', name: 'Bitcoin', shares: 1, avgCost: 100, valueUsd: 200, change24h: 1, addedAt: '', costBasis: 0, unrealisedPnl: 0, unrealisedPnlPct: 0, realisedPnl: 0, closed: false },
    { id: 'p1', symbol: 'ETH', name: 'Ethereum', shares: 2, avgCost: 50, valueUsd: 100, change24h: -1, addedAt: '', costBasis: 0, unrealisedPnl: 0, unrealisedPnlPct: 0, realisedPnl: 0, closed: false },
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
    addedAt: '', costBasis: 0, unrealisedPnl: 0, unrealisedPnlPct: 0, realisedPnl: 0, closed: false,
  }));
}

const noop = { onBuy: vi.fn(), onSell: vi.fn(), onHistory: vi.fn(), onDelete: vi.fn() };

describe('TopAssetsTable', () => {
  it('renders a Delete button per row and calls onDelete with the row symbol', () => {
    const onBuy = vi.fn();
    const onDelete = vi.fn();
    render(
      <TopAssetsTable positions={makePositions()} isLoading={false} {...noop} onBuy={onBuy} onDelete={onDelete} />
    );

    const deleteButtons = screen.getAllByRole('button', { name: /delete .* position/i });
    expect(deleteButtons).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: /delete BTC position/i }));
    expect(onDelete).toHaveBeenCalledWith('BTC');
    expect(onBuy).not.toHaveBeenCalled();
  });

  it('truncates to 5 rows and expands via "View All Holdings"', () => {
    render(
      <TopAssetsTable positions={manyPositions(7)} isLoading={false} {...noop} />
    );

    // Only the top 5 rows are visible initially.
    expect(screen.getAllByRole('button', { name: /delete .* position/i })).toHaveLength(5);

    fireEvent.click(screen.getByRole('button', { name: /view all holdings \(7\)/i }));
    expect(screen.getAllByRole('button', { name: /delete .* position/i })).toHaveLength(7);

    fireEvent.click(screen.getByRole('button', { name: /show fewer/i }));
    expect(screen.getAllByRole('button', { name: /delete .* position/i })).toHaveLength(5);
  });

  it('has Buy / Sell / History actions that receive the whole position', () => {
    const onBuy = vi.fn();
    const onSell = vi.fn();
    const onHistory = vi.fn();
    const positions = makePositions();
    render(
      <TopAssetsTable positions={positions} isLoading={false} {...noop} onBuy={onBuy} onSell={onSell} onHistory={onHistory} />
    );

    expect(screen.queryByRole('button', { name: /^edit/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Buy BTC' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sell ETH' }));
    fireEvent.click(screen.getByRole('button', { name: 'BTC history' }));
    expect(onBuy).toHaveBeenCalledWith(positions[0]);
    expect(onSell).toHaveBeenCalledWith(positions[1]);
    expect(onHistory).toHaveBeenCalledWith(positions[0]);
  });

  it('shows unrealised P&L with gain/loss tone', () => {
    const positions = makePositions().map((p, i) => ({
      ...p,
      unrealisedPnl: i === 0 ? 50 : -20,
      unrealisedPnlPct: i === 0 ? 25 : -10,
    }));
    render(<TopAssetsTable positions={positions} isLoading={false} {...noop} />);

    expect(screen.getByText('Unrealised P&L')).toBeInTheDocument();
    expect(screen.getByText('+$50.00')).toHaveClass('positive');
    expect(screen.getByText('-$20.00')).toHaveClass('negative');
  });

  it('lists closed holdings with realised P&L and no Sell action', () => {
    const closed = [{ ...makePositions()[0], symbol: 'TSLA', name: 'Tesla', shares: 0, closed: true, realisedPnl: 120 }];
    render(<TopAssetsTable positions={makePositions()} closedPositions={closed} isLoading={false} {...noop} />);

    const section = screen.getByRole('region', { name: /closed holdings/i });
    expect(section).toHaveTextContent('TSLA');
    expect(section).toHaveTextContent('+$120.00');
    expect(screen.queryByRole('button', { name: 'Sell TSLA' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Buy TSLA' })).toBeInTheDocument();
  });

  it('omits the closed section when nothing is closed', () => {
    render(<TopAssetsTable positions={makePositions()} isLoading={false} {...noop} />);
    expect(screen.queryByRole('region', { name: /closed holdings/i })).toBeNull();
  });

  it('shows a dash instead of +$0.00 / 0.00% for an unpriced holding', () => {
    const positions = [{ ...makePositions()[0], valueUsd: 0, costBasis: 100, unrealisedPnl: 0, unrealisedPnlPct: 0 }];
    render(<TopAssetsTable positions={positions} isLoading={false} {...noop} />);

    expect(screen.queryByText('+$0.00')).not.toBeInTheDocument();
    expect(screen.queryByText('0.00%')).not.toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });
});
