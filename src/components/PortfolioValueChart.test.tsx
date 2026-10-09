import { render, screen, fireEvent } from '@testing-library/react';
import PortfolioValueChart from './PortfolioValueChart';
import { usePortfolioValueHistory } from '../hooks/usePortfolioValueHistory';
import { useBenchmarks } from '../hooks/useBenchmarks';
import { useBenchmarkPreference } from '../hooks/useBenchmarkPreference';
import type { ValueHistory, ValuePoint } from '../api/portfolios';

vi.mock('../hooks/usePortfolioValueHistory', () => ({ usePortfolioValueHistory: vi.fn() }));
vi.mock('../hooks/useBenchmarks', () => ({ useBenchmarks: vi.fn() }));
vi.mock('../hooks/useBenchmarkPreference', () => ({ useBenchmarkPreference: vi.fn() }));

const mockedHistory = vi.mocked(usePortfolioValueHistory);
const mockedBenchmarks = vi.mocked(useBenchmarks);
const mockedPref = vi.mocked(useBenchmarkPreference);
const setSymbol = vi.fn();

const LIST = [
  { symbol: 'SPY', label: 'S&P 500' },
  { symbol: 'QQQ', label: 'Nasdaq 100' },
];

function setHistory(state: {
  points?: ValuePoint[];
  isLoading?: boolean;
  isError?: boolean;
  benchmark?: ValueHistory['benchmark'];
}) {
  mockedHistory.mockReturnValue({
    data: state.points ? { range: '30D', points: state.points, benchmark: state.benchmark } : undefined,
    isLoading: state.isLoading ?? false,
    isError: state.isError ?? false,
  } as unknown as ReturnType<typeof usePortfolioValueHistory>);
}

describe('PortfolioValueChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedBenchmarks.mockReturnValue({ data: LIST } as unknown as ReturnType<typeof useBenchmarks>);
    mockedPref.mockReturnValue([null, setSymbol]);
  });

  it('explains itself when no value has been recorded yet', () => {
    setHistory({ points: [] });
    render(<PortfolioValueChart />);

    expect(screen.getByText(/Not enough history yet/)).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('says when recording started if there is only one day so far', () => {
    setHistory({ points: [{ date: '2026-10-01', value: 1000, returnPct: 0 }] });
    render(<PortfolioValueChart />);

    expect(screen.getByText(/Not enough history yet.*starting Oct 1/)).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('draws the chart and summarises it once there are two days', () => {
    setHistory({
      points: [
        { date: '2026-09-30', value: 1000, returnPct: 0 },
        { date: '2026-10-01', value: 1250.5, returnPct: 0 },
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
    expect(mockedHistory).toHaveBeenLastCalledWith('30D', null);

    fireEvent.click(screen.getByRole('button', { name: '1Y' }));

    expect(mockedHistory).toHaveBeenLastCalledWith('1Y', null);
    expect(screen.getByRole('button', { name: '1Y' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '30D' })).toHaveAttribute('aria-pressed', 'false');
  });

  describe('benchmark overlay', () => {
    const withCloses: ValuePoint[] = [
      { date: '2026-09-30', value: 1000, returnPct: 0, benchmarkClose: 500 },
      { date: '2026-10-01', value: 1100, returnPct: 10, benchmarkClose: 490 },
    ];

    it('is off by default and shows the dollar chart', () => {
      setHistory({ points: withCloses });
      render(<PortfolioValueChart />);

      expect(screen.getByLabelText('Compare with')).toHaveValue('');
      expect(screen.getByRole('img', { name: /Total value from \$1,000.00/ })).toBeInTheDocument();
      expect(screen.queryByText(/% change from/)).toBeNull();
    });

    it('stores the chosen benchmark', () => {
      setHistory({ points: withCloses });
      render(<PortfolioValueChart />);

      fireEvent.change(screen.getByLabelText('Compare with'), { target: { value: 'SPY' } });
      expect(setSymbol).toHaveBeenCalledWith('SPY');
    });

    it('passes the chosen symbol to the history hook and explains the percent chart', () => {
      mockedPref.mockReturnValue(['SPY', setSymbol]);
      setHistory({
        points: withCloses,
        benchmark: { symbol: 'SPY', label: 'S&P 500', available: true },
      });
      render(<PortfolioValueChart />);

      expect(mockedHistory).toHaveBeenLastCalledWith('30D', 'SPY');
      expect(screen.getByLabelText('Compare with')).toHaveValue('SPY');
      expect(
        screen.getByText(
          '% change from Sep 30. The portfolio line is a time-weighted return, so money you add or withdraw does not move it.'
        )
      ).toBeInTheDocument();
      expect(
        screen.getByRole('img', {
          name: 'Percent change since Sep 30, 2026: portfolio +10.00%, S&P 500 -2.00%',
        })
      ).toBeInTheDocument();
    });

    it('keeps the dollar chart and says so when the index data is unavailable', () => {
      mockedPref.mockReturnValue(['SPY', setSymbol]);
      setHistory({
        points: [
          { date: '2026-09-30', value: 1000, returnPct: 0 },
          { date: '2026-10-01', value: 1100, returnPct: 0 },
        ],
        benchmark: { symbol: 'SPY', label: 'S&P 500', available: false },
      });
      render(<PortfolioValueChart />);

      expect(screen.getByText('S&P 500 data is unavailable right now.')).toBeInTheDocument();
      expect(screen.getByRole('img', { name: /Total value from/ })).toBeInTheDocument();
      expect(screen.queryByText(/% change from/)).toBeNull();
    });
  });
});
