import { render, screen, fireEvent } from '@testing-library/react';
import AssetPriceChart from './AssetPriceChart';
import { useStockHistory } from '../hooks/useStockHistory';
import type { StockHistory } from '../api/stocks';

vi.mock('../hooks/useStockHistory', () => ({
  useStockHistory: vi.fn(),
}));

const mockedUseStockHistory = vi.mocked(useStockHistory);

type HistoryState = ReturnType<typeof useStockHistory>;
function historyState(overrides: Partial<HistoryState> = {}): HistoryState {
  return {
    data: undefined,
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  };
}

function makeHistory(...closes: number[]): StockHistory {
  return {
    symbol: 'GOOG',
    range: '3M',
    points: closes.map((close, i) => ({ date: `2026-0${i + 1}-01`, close })),
  };
}

describe('AssetPriceChart', () => {
  beforeEach(() => {
    mockedUseStockHistory.mockReset();
    mockedUseStockHistory.mockReturnValue(historyState());
  });

  it('defaults to the 3M range and re-queries when another range is picked', () => {
    mockedUseStockHistory.mockReturnValue(historyState({ data: makeHistory(100, 105, 110) }));
    render(<AssetPriceChart symbol="GOOG" currency="USD" />);

    const btn3m = screen.getByRole('button', { name: '3M' });
    const btn1y = screen.getByRole('button', { name: '1Y' });
    expect(btn3m).toHaveAttribute('aria-pressed', 'true');
    expect(btn1y).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(btn1y);

    expect(btn1y).toHaveAttribute('aria-pressed', 'true');
    expect(btn3m).toHaveAttribute('aria-pressed', 'false');
    expect(mockedUseStockHistory).toHaveBeenCalledWith('GOOG', '1Y');
  });

  it('surfaces an API failure with a retry action', () => {
    const refetch = vi.fn();
    mockedUseStockHistory.mockReturnValue(historyState({ isError: true, refetch }));
    render(<AssetPriceChart symbol="GOOG" currency="USD" />);

    expect(screen.getByText(/Price data unavailable/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it('shows an explicit message when the asset has no price history', () => {
    mockedUseStockHistory.mockReturnValue(historyState({ data: makeHistory(100) }));
    render(<AssetPriceChart symbol="GOOG" currency="USD" />);

    expect(screen.getByText(/No price history/i)).toBeInTheDocument();
  });

  it('renders a loading skeleton while fetching', () => {
    mockedUseStockHistory.mockReturnValue(historyState({ isLoading: true }));
    const { container } = render(<AssetPriceChart symbol="GOOG" currency="USD" />);

    expect(container.querySelector('.apc-skel')).toBeInTheDocument();
    expect(screen.queryByText(/unavailable/i)).not.toBeInTheDocument();
  });
});
