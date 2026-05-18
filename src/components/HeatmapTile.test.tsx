import { render, screen } from '@testing-library/react';
import HeatmapTile from './HeatmapTile';
import type { WatchlistEntry } from '../hooks/useWatchlistQuotes';

// A reusable base item so each test only changes what it needs.
const baseItem = {
  id: '1',
  userId: 'u1',
  symbol: 'AAPL',
  name: 'Apple Inc.',
  type: 'Stock',
  addedAt: '2026-01-01',
};

function makeEntry(overrides: Partial<WatchlistEntry>): WatchlistEntry {
  return {
    item: baseItem,
    priceChange: null,
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

    // No percentage or "unavailable" text should appear
    expect(screen.queryByText(/unavailable/i)).not.toBeInTheDocument();
    expect(screen.queryByText('1D change')).not.toBeInTheDocument();
  });

  it('shows "unavailable" on error', () => {
    render(<HeatmapTile entry={makeEntry({ status: 'error', error: 'Network error' })} />);

    expect(screen.getByText('unavailable')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows a positive change with the correct label', () => {
    render(
      <HeatmapTile
        entry={makeEntry({ priceChange: { '1D': 2.5 }, status: 'success' })}
      />
    );

    expect(screen.getByText('+2.50%')).toBeInTheDocument();
    expect(screen.getByText('1D change')).toBeInTheDocument();

    const changeEl = screen.getByText('+2.50%');
    expect(changeEl).toHaveClass('positive');
  });

  it('shows a negative change with the correct label', () => {
    render(
      <HeatmapTile
        entry={makeEntry({ priceChange: { '1D': -1.3 }, status: 'success' })}
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
