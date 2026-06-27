import { render, screen, fireEvent, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DividendScheduleModal from './DividendScheduleModal';
import { useDividendCalendar } from '../hooks/useDividendCalendar';
import type { DividendEvent } from '../api/dividends';

vi.mock('../hooks/useDividendCalendar', () => ({ useDividendCalendar: vi.fn() }));

const mocked = vi.mocked(useDividendCalendar);

function event(overrides: Partial<DividendEvent> = {}): DividendEvent {
  return {
    symbol: 'KO',
    exDate: '2026-07-13T00:00:00Z',
    recordDate: '2026-07-14T00:00:00Z',
    paymentDate: '2026-07-15T00:00:00Z',
    declarationDate: '0001-01-01T00:00:00Z',
    dividend: 0.51,
    adjDividend: 0.51,
    yield: 2.9,
    frequency: 'Quarterly',
    shares: 40,
    estimatedAmount: 20.4,
    ...overrides,
  };
}

const EVENTS: DividendEvent[] = [
  event({ symbol: 'AAPL', paymentDate: '2026-06-30T00:00:00Z', dividend: 0.24, estimatedAmount: 4.05 }),
  event({ symbol: 'MSFT', paymentDate: '2026-06-30T00:00:00Z', dividend: 0.75, estimatedAmount: 30 }),
  event({ symbol: 'KO', paymentDate: '2026-07-15T00:00:00Z', dividend: 0.51, estimatedAmount: 20.4 }),
];

describe('DividendScheduleModal', () => {
  beforeEach(() => {
    mocked.mockReset();
    // Pin "today" so the nearest-upcoming-day defaulting is deterministic.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 27)); // 2026-06-27 (local)
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('defaults to the nearest upcoming day and lists its payouts', () => {
    mocked.mockReturnValue({ data: EVENTS, isLoading: false, isError: false, refetch: vi.fn() });

    render(<DividendScheduleModal open onClose={() => {}} />);

    // Nearest upcoming payout day is 2026-06-30 (two events).
    expect(screen.getByRole('heading', { name: /June 30/ })).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('MSFT')).toBeInTheDocument();
    expect(screen.getByText('$4.05')).toBeInTheDocument();
    expect(screen.getByText('$30.00')).toBeInTheDocument();
  });

  it('sums the estimated monthly total for the viewed month', () => {
    mocked.mockReturnValue({ data: EVENTS, isLoading: false, isError: false, refetch: vi.fn() });

    render(<DividendScheduleModal open onClose={() => {}} />);

    // June: 4.05 + 30 = 34.05
    expect(screen.getByText('$34.05')).toBeInTheDocument();

    // Navigate to July → only KO (20.40).
    fireEvent.click(screen.getByRole('button', { name: /next month/i }));
    expect(screen.getByText('$20.40')).toBeInTheDocument();
  });

  it('updates the panel when another day is selected', () => {
    mocked.mockReturnValue({ data: EVENTS, isLoading: false, isError: false, refetch: vi.fn() });

    render(<DividendScheduleModal open onClose={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /next month/i }));
    // The 15th of July carries the KO payout.
    fireEvent.click(screen.getByRole('button', { name: /^15, 1 payout$/ }));

    expect(screen.getByRole('heading', { name: /July 15/ })).toBeInTheDocument();
    const events = screen.getByRole('list');
    expect(within(events).getByText('KO')).toBeInTheDocument();
    expect(within(events).getByText('$20.40')).toBeInTheDocument();
  });

  it('shows an empty state when there are no upcoming dividends', () => {
    mocked.mockReturnValue({ data: [], isLoading: false, isError: false, refetch: vi.fn() });

    render(<DividendScheduleModal open onClose={() => {}} />);

    expect(screen.getByText(/no upcoming dividends/i)).toBeInTheDocument();
  });

  it('shows an error state with a retry action', () => {
    const refetch = vi.fn();
    mocked.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch });

    render(<DividendScheduleModal open onClose={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(refetch).toHaveBeenCalled();
  });
});
