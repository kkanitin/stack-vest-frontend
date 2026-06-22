import { render, screen } from '@testing-library/react';
import HeatmapTile from './HeatmapTile';
import type { WatchlistEntry } from '../hooks/useWatchlistQuotes';
import type { StockPriceChange } from '../api/stocks';

const baseItem = {
  id: '1',
  userId: 'u1',
  symbol: 'AAPL',
  name: 'Apple Inc.',
  type: 'Stock',
  addedAt: '2026-01-01',
  alertsEnabled: false,
  category: [],
};

function makePriceChange(oneDay: number): StockPriceChange {
  return {
    symbol: 'AAPL',
    '1D': oneDay,
    '5D': 0, '1M': 0, '3M': 0, '6M': 0, ytd: 0,
    '1Y': 0, '3Y': 0, '5Y': 0, '10Y': 0, max: 0,
  };
}

function makeEntry(overrides: Partial<WatchlistEntry>): WatchlistEntry {
  return {
    item: baseItem,
    priceChange: null,
    quote: null,
    history: null,
    status: 'success',
    error: null,
    ...overrides,
  };
}

describe('HeatmapTile', () => {
  it('always shows the symbol and name', () => {
    render(<HeatmapTile entry={makeEntry({})} />);

    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
  });

  it('shows skeleton placeholders while loading', () => {
    render(<HeatmapTile entry={makeEntry({ status: 'loading' })} />);

    expect(screen.queryByText(/unavailable/i)).not.toBeInTheDocument();
    expect(screen.queryByText('1D')).not.toBeInTheDocument();
  });

  it('shows "unavailable" on error', () => {
    render(<HeatmapTile entry={makeEntry({ status: 'error', error: 'Network error' })} />);

    expect(screen.getByText('unavailable')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows a positive change with the correct label', () => {
    render(
      <HeatmapTile
        entry={makeEntry({ priceChange: makePriceChange(2.5), status: 'success' })}
      />
    );

    expect(screen.getByText('+2.50%')).toBeInTheDocument();
    expect(screen.getByText('1D')).toBeInTheDocument();

    const changeEl = screen.getByText('+2.50%');
    expect(changeEl).toHaveClass('positive');
  });

  it('shows a negative change with the correct label', () => {
    render(
      <HeatmapTile
        entry={makeEntry({ priceChange: makePriceChange(-1.3), status: 'success' })}
      />
    );

    expect(screen.getByText('-1.30%')).toBeInTheDocument();

    const changeEl = screen.getByText('-1.30%');
    expect(changeEl).toHaveClass('negative');
  });

  it('shows a dash when price data is not yet available', () => {
    render(<HeatmapTile entry={makeEntry({ priceChange: null, status: 'success' })} />);

    expect(screen.getByText('—')).toBeInTheDocument();

    const changeEl = screen.getByText('—');
    expect(changeEl).toHaveClass('neutral');
  });
});
