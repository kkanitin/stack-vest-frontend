import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import IndexTreemap from './IndexTreemap';
import type { HeatmapSector } from '../api/market';

const sectors: HeatmapSector[] = [
  {
    name: 'Technology',
    marketCap: 7e12,
    stocks: [
      { symbol: 'MSFT', name: 'Microsoft', subSector: 'Software', marketCap: 4e12, price: 430,
        change: { '1D': 2.5, '1W': -1, '1M': 4, YTD: 39.9 } },
      { symbol: 'AAPL', name: 'Apple', subSector: 'Hardware', marketCap: 3e12, price: 220,
        change: { '1D': -0.8, '1W': null, '1M': null, YTD: null } },
    ],
  },
  {
    name: 'Finance',
    marketCap: 1e12,
    stocks: [
      { symbol: 'JPM', name: 'JPMorgan', subSector: 'Banks', marketCap: 1e12, price: 200,
        change: { '1D': 0, '1W': 1, '1M': 1, YTD: 7.5 } },
    ],
  },
];

describe('IndexTreemap', () => {
  const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 1000 });
  });
  afterAll(() => {
    if (original) Object.defineProperty(HTMLElement.prototype, 'clientWidth', original);
  });

  it('renders a tile per stock and a header per sector', () => {
    render(<IndexTreemap sectors={sectors} period="1D" />);
    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(screen.getByText('Technology ›')).toBeInTheDocument();
    expect(screen.getByText('Finance ›')).toBeInTheDocument();
  });

  it('colours tiles by the selected period', () => {
    const { rerender } = render(<IndexTreemap sectors={sectors} period="1D" />);
    const msft = () => screen.getByRole('button', { name: /^MSFT/ });
    expect(msft()).toHaveAttribute('data-level', '3');
    expect(screen.getByRole('button', { name: /^AAPL/ })).toHaveAttribute('data-level', '-1');
    expect(screen.getByRole('button', { name: /^JPM/ })).toHaveAttribute('data-level', '0');

    rerender(<IndexTreemap sectors={sectors} period="1W" />);
    expect(msft()).toHaveAttribute('data-level', '-1');
    expect(msft()).toHaveAccessibleName('MSFT Microsoft -1.00% 1W');
  });

  it('shows missing periods as a dash', () => {
    render(<IndexTreemap sectors={sectors} period="YTD" />);
    expect(screen.getByRole('button', { name: /^AAPL/ })).toHaveAccessibleName('AAPL Apple — YTD');
  });

  it('calls onSelect with the symbol and shows a tooltip on hover', () => {
    const onSelect = vi.fn();
    render(<IndexTreemap sectors={sectors} period="1D" onSelect={onSelect} />);
    const msft = screen.getByRole('button', { name: /^MSFT/ });
    fireEvent.click(msft);
    expect(onSelect).toHaveBeenCalledWith('MSFT');

    fireEvent.mouseEnter(msft);
    const tip = screen.getByRole('tooltip');
    expect(tip).toHaveTextContent('Microsoft');
    expect(tip).toHaveTextContent('Technology · Software');
    expect(tip).toHaveTextContent('$4.00T');
    fireEvent.mouseLeave(msft);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
