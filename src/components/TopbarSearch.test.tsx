import { render, screen, fireEvent } from '@testing-library/react';
import TopbarSearch from './TopbarSearch';
import { useStockSearch } from '../hooks/useStockSearch';
import type { StockSearchResult } from '../api/stocks';

vi.mock('../hooks/useStockSearch', () => ({
  useStockSearch: vi.fn(),
}));

const mockedUseStockSearch = vi.mocked(useStockSearch);

function makeResult(symbol: string, name: string): StockSearchResult {
  return { symbol, name, type: 'Equity', region: 'US', currency: 'USD' };
}

describe('TopbarSearch', () => {
  beforeEach(() => {
    mockedUseStockSearch.mockReset();
  });

  it('does not show the dropdown until the user types', () => {
    mockedUseStockSearch.mockReturnValue({ results: [], status: 'idle', error: null });
    render(<TopbarSearch onSelect={() => {}} />);

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows results and calls onSelect with the symbol when a row is clicked', () => {
    mockedUseStockSearch.mockReturnValue({
      results: [makeResult('AAPL', 'Apple Inc.'), makeResult('AMZN', 'Amazon.com Inc.')],
      status: 'success',
      error: null,
    });
    const onSelect = vi.fn();
    render(<TopbarSearch onSelect={onSelect} />);

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'a' } });

    expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
    fireEvent.click(screen.getByText('AAPL'));

    expect(onSelect).toHaveBeenCalledWith('AAPL');
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('shows an empty state when there are no results', () => {
    mockedUseStockSearch.mockReturnValue({ results: [], status: 'success', error: null });
    render(<TopbarSearch onSelect={() => {}} />);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } });

    expect(screen.getByText(/No results for/i)).toBeInTheDocument();
  });

  it('shows an error state when the search fails', () => {
    mockedUseStockSearch.mockReturnValue({ results: [], status: 'error', error: 'Search failed' });
    render(<TopbarSearch onSelect={() => {}} />);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'a' } });

    expect(screen.getByText(/Search failed/i)).toBeInTheDocument();
  });
});
