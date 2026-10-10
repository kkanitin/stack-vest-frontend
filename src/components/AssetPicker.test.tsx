import { render, screen, fireEvent } from '@testing-library/react';
import AssetPicker from './AssetPicker';
import { useStockSearch } from '../hooks/useStockSearch';
import type { StockSearchResult } from '../api/stocks';

vi.mock('../hooks/useStockSearch', () => ({
  useStockSearch: vi.fn(),
}));

const mockedUseStockSearch = vi.mocked(useStockSearch);

function makeResult(symbol: string, name: string): StockSearchResult {
  return { symbol, name, type: 'Equity', region: 'US', currency: 'USD' };
}

const apple = { symbol: 'AAPL', name: 'Apple Inc.' };

describe('AssetPicker', () => {
  beforeEach(() => {
    mockedUseStockSearch.mockReset();
    mockedUseStockSearch.mockReturnValue({ results: [], status: 'idle', error: null });
  });

  it('shows the selected ticker and name, with no dropdown until the user types', () => {
    render(<AssetPicker value={apple} onChange={() => {}} />);

    const input = screen.getByRole('combobox') as HTMLInputElement;
    expect(input.value).toBe('AAPL — Apple Inc.');
    fireEvent.focus(input);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('selects a search result and returns to showing the selection', () => {
    mockedUseStockSearch.mockReturnValue({
      results: [makeResult('MSFT', 'Microsoft Corporation')],
      status: 'success',
      error: null,
    });
    const onChange = vi.fn();
    const { rerender } = render(<AssetPicker value={apple} onChange={onChange} />);

    const input = screen.getByRole('combobox') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'micro' } });
    fireEvent.click(screen.getByText('Microsoft Corporation'));

    expect(onChange).toHaveBeenCalledWith({ symbol: 'MSFT', name: 'Microsoft Corporation' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    rerender(<AssetPicker value={{ symbol: 'MSFT', name: 'Microsoft Corporation' }} onChange={onChange} />);
    expect(input.value).toBe('MSFT — Microsoft Corporation');
  });

  it('shows an empty state when nothing matches', () => {
    mockedUseStockSearch.mockReturnValue({ results: [], status: 'success', error: null });
    render(<AssetPicker value={apple} onChange={() => {}} />);

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'zzzz' } });

    expect(screen.getByText('No results for "zzzz"')).toBeInTheDocument();
  });

  it('Escape closes the dropdown without changing the selection', () => {
    mockedUseStockSearch.mockReturnValue({
      results: [makeResult('MSFT', 'Microsoft Corporation')],
      status: 'success',
      error: null,
    });
    const onChange = vi.fn();
    render(<AssetPicker value={apple} onChange={onChange} />);

    const input = screen.getByRole('combobox') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'm' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe('AAPL — Apple Inc.');
  });
});
