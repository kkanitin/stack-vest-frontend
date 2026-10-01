import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Visualization from './Visualization';
import { useAllPositions } from '../hooks/useAllPositions';
import { useRecentActivity } from '../hooks/useRecentActivity';
import { usePortfoliosSummary } from '../hooks/usePortfoliosSummary';
import type { PortfolioActivity } from '../api/portfolios';
import type { PortfolioPosition } from '../api/portfolio';

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { name: 'Ada Lovelace' }, token: 't' }) }));
vi.mock('../hooks/useAllPositions', () => ({ useAllPositions: vi.fn() }));
vi.mock('../hooks/useRecentActivity', () => ({ useRecentActivity: vi.fn() }));
vi.mock('../hooks/usePortfoliosSummary', () => ({ usePortfoliosSummary: vi.fn() }));
vi.mock('../hooks/usePortfolioValueHistory', () => ({
  usePortfolioValueHistory: () => ({ data: { range: '30D', points: [] }, isLoading: false, isError: false }),
}));
vi.mock('../hooks/useFearGreedIndex', () => ({
  useFearGreedIndex: () => ({ data: undefined, isLoading: true, isError: false }),
}));

const mockedPositions = vi.mocked(useAllPositions);
const mockedActivity = vi.mocked(useRecentActivity);
const mockedSummary = vi.mocked(usePortfoliosSummary);

function pos(symbol: string, valueUsd: number, change24h: number): PortfolioPosition {
  return { id: `${symbol}-${valueUsd}`, symbol, name: `${symbol} Fund`, shares: 1, avgCost: 1, valueUsd, change24h, addedAt: '' };
}

function setPositions(state: { positions?: PortfolioPosition[]; isLoading?: boolean; isError?: boolean }) {
  mockedPositions.mockReturnValue({
    data: state.isError || state.isLoading ? undefined : state.positions ?? [],
    isLoading: state.isLoading ?? false,
    isError: state.isError ?? false,
  } as unknown as ReturnType<typeof useAllPositions>);
}

function setActivity(state: { entries?: PortfolioActivity[]; isError?: boolean }) {
  mockedActivity.mockReturnValue({
    data: state.isError ? undefined : state.entries ?? [],
    isLoading: false,
    isError: state.isError ?? false,
  } as unknown as ReturnType<typeof useRecentActivity>);
}

function setSummary(totalValue: number, changePct: number) {
  mockedSummary.mockReturnValue({
    data: { totalValue, changePct, diversificationScore: 50 },
    isLoading: false,
    isError: false,
    isFetching: false,
  } as unknown as ReturnType<typeof usePortfoliosSummary>);
}

function renderOverview() {
  return render(
    <MemoryRouter>
      <Visualization />
    </MemoryRouter>
  );
}

function card(title: string): HTMLElement {
  return screen.getByText(title).closest('[data-slot="card"]') as HTMLElement;
}

describe('Overview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivity({});
    setSummary(1000, 10);
  });

  it('shows holdings merged across portfolios in allocation, top holdings and the daily movement card', () => {
    setPositions({ positions: [pos('VOO', 600, 1.5), pos('QQQ', 100, -2), pos('VOO', 300, 1.5)] });
    renderOverview();

    // VOO is held twice but appears once, at its combined 90% weight.
    const top = within(card('Top Holdings'));
    expect(top.getAllByText('VOO')).toHaveLength(1);
    expect(top.getByText('$900.00')).toBeInTheDocument();
    expect(top.getByText('90.0%')).toBeInTheDocument();

    expect(within(card('Allocation')).getByText('10.0%')).toBeInTheDocument();

    const today = within(card('Your Holdings Today'));
    expect(today.getByText('▲ 1 up')).toBeInTheDocument();
    expect(today.getByText('▼ 1 down')).toBeInTheDocument();
    // Movers are ranked by the size of the move, so the -2% loss leads the +1.5% gain.
    const movers = within(today.getByRole('region', { name: /biggest movers/i })).getAllByRole('listitem');
    expect(movers.map(li => li.textContent)).toEqual([
      expect.stringContaining('QQQ'),
      expect.stringContaining('VOO'),
    ]);
    expect(movers[0]).toHaveTextContent('-2.00%');
  });

  it('shows the total with its 30-day change in money and percent', () => {
    setPositions({ positions: [pos('VOO', 1100, 0)] });
    setSummary(1100, 10);
    renderOverview();

    const hero = within(card('Total Portfolio Value'));
    expect(hero.getByText('$1,100.00')).toBeInTheDocument();
    expect(hero.getByText('+10.00%')).toBeInTheDocument();
    expect(hero.getByText(/\+\$100\.00 over 30 days/)).toBeInTheDocument();
  });

  it('shows a 30-day change that displays as zero as neutral and unsigned', () => {
    setPositions({ positions: [pos('VOO', 1000, 0)] });
    setSummary(1000, -0.004);
    renderOverview();

    const badge = within(card('Total Portfolio Value')).getByText('0.00%');
    expect(badge).toHaveAttribute('data-variant', 'neutral');
  });

  it('leaves the change out when there is no value to measure it against', () => {
    setPositions({});
    setSummary(0, 0);
    renderOverview();

    const hero = within(card('Total Portfolio Value'));
    expect(hero.queryByText(/over 30 days/)).toBeNull();
    // Nothing held means nothing to chart either.
    expect(hero.queryByText('Recorded value')).toBeNull();
  });

  it('puts the recorded-value trend inside the hero card once there is value to track', () => {
    setPositions({ positions: [pos('VOO', 1000, 0)] });
    renderOverview();

    const hero = within(card('Total Portfolio Value'));
    expect(hero.getByText('Recorded value')).toBeInTheDocument();
    expect(hero.getByText(/Not enough history yet/)).toBeInTheDocument();
  });

  it('replaces the holdings cards with one prompt when there are no holdings', () => {
    setPositions({});
    renderOverview();

    expect(screen.getByText(/No holdings yet/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to portfolios' })).toHaveAttribute('href', '/dashboard/portfolios');
    expect(screen.queryByText('Top Holdings')).toBeNull();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });

  it('reports a load failure rather than an empty portfolio', () => {
    setPositions({ isError: true });
    renderOverview();

    expect(screen.getByText(/Couldn't load your holdings\. Please try again/)).toBeInTheDocument();
    expect(screen.queryByText(/No holdings yet/)).toBeNull();
    expect(within(card('Your Holdings Today')).getByText('Unavailable')).toBeInTheDocument();
  });

  it('shows neither the empty prompt nor a failure while holdings are still loading', () => {
    setPositions({ isLoading: true });
    renderOverview();

    expect(screen.queryByText(/No holdings yet/)).toBeNull();
    expect(screen.queryByText(/Couldn't load your holdings/)).toBeNull();
    expect(screen.getByText('Top Holdings')).toBeInTheDocument();
  });

  it('lists recent activity with the portfolio it happened in', () => {
    setPositions({ positions: [pos('VOO', 600, 1.5)] });
    setActivity({
      entries: [
        {
          id: 'a1',
          symbol: 'VOO',
          label: 'Bought VOO',
          detail: '3 shares @ $412.00',
          tone: 'positive',
          badge: 'BUY',
          timestamp: new Date().toISOString(),
          portfolioId: 'p1',
          portfolioName: 'Core',
        },
        // A row without a portfolio name shows its detail alone, with no dangling separator.
        { id: 'a2', label: 'Sold QQQ', detail: 'Position closed', tone: 'neutral', badge: 'SELL', timestamp: '2026-01-05T00:00:00Z' },
      ],
    });
    renderOverview();

    const activity = within(card('Recent Activity'));
    expect(activity.getByText('Bought VOO')).toBeInTheDocument();
    expect(activity.getByText('3 shares @ $412.00 · Core')).toBeInTheDocument();
    expect(activity.getByText('BUY')).toBeInTheDocument();
    expect(activity.getByText('just now')).toBeInTheDocument();
    expect(activity.getByText('Position closed')).toBeInTheDocument();
  });

  it('reports an activity load failure instead of "no recent activity"', () => {
    setPositions({ positions: [pos('VOO', 600, 1.5)] });
    setActivity({ isError: true });
    renderOverview();

    const activity = within(card('Recent Activity'));
    expect(activity.getByText("Couldn't load recent activity.")).toBeInTheDocument();
    expect(activity.queryByText('No recent activity.')).toBeNull();
  });
});
