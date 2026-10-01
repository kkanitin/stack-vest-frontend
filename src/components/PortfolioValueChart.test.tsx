import { render, screen, fireEvent } from '@testing-library/react';
import PortfolioValueChart from './PortfolioValueChart';
import { usePortfolioValueHistory } from '../hooks/usePortfolioValueHistory';
import type { ValuePoint } from '../api/portfolios';

vi.mock('../hooks/usePortfolioValueHistory', () => ({ usePortfolioValueHistory: vi.fn() }));

const mockedHistory = vi.mocked(usePortfolioValueHistory);

function setHistory(state: { points?: ValuePoint[]; isLoading?: boolean; isError?: boolean }) {
  mockedHistory.mockReturnValue({
    data: state.points ? { range: '30D', points: state.points } : undefined,
    isLoading: state.isLoading ?? false,
    isError: state.isError ?? false,
  } as unknown as ReturnType<typeof usePortfolioValueHistory>);
}

describe('PortfolioValueChart', () => {
  beforeEach(() => vi.clearAllMocks());

  it('explains itself when no value has been recorded yet', () => {
    setHistory({ points: [] });
    render(<PortfolioValueChart />);

    expect(screen.getByText(/Not enough history yet/)).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('says when recording started if there is only one day so far', () => {
    setHistory({ points: [{ date: '2026-10-01', value: 1000 }] });
    render(<PortfolioValueChart />);

    expect(screen.getByText(/Not enough history yet.*starting Oct 1/)).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('draws the chart and summarises it once there are two days', () => {
    setHistory({
      points: [
        { date: '2026-09-30', value: 1000 },
        { date: '2026-10-01', value: 1250.5 },
      ],
    });
    render(<PortfolioValueChart />);

    expect(
      screen.getByRole('img', {
        name: 'Total value from $1,000.00 on Sep 30, 2026 to $1,250.50 on Oct 1, 2026',
      })
    ).toBeInTheDocument();
    expect(screen.queryByText(/Not enough history yet/)).toBeNull();
  });

  it('reports a failed load without pretending there is no history', () => {
    setHistory({ isError: true });
    render(<PortfolioValueChart />);

    expect(screen.getByText('Value history is unavailable right now.')).toBeInTheDocument();
    expect(screen.queryByText(/Not enough history yet/)).toBeNull();
  });

  it('requests the range the user picks', () => {
    setHistory({ points: [] });
    render(<PortfolioValueChart />);
    expect(mockedHistory).toHaveBeenLastCalledWith('30D');

    fireEvent.click(screen.getByRole('button', { name: '1Y' }));

    expect(mockedHistory).toHaveBeenLastCalledWith('1Y');
    expect(screen.getByRole('button', { name: '1Y' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '30D' })).toHaveAttribute('aria-pressed', 'false');
  });
});
