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

// One array per viewed month, as the per-month hook returns them. Module-level so the
// references stay stable across renders.
const EMPTY: DividendEvent[] = [];
const MONTHS: Record<string, DividendEvent[]> = {
  '2026-5': [
    event({ symbol: 'PG', paymentDate: '2026-05-12T00:00:00Z', dividend: 1.05, estimatedAmount: 10.5 }),
    event({ symbol: 'JNJ', paymentDate: '2026-05-20T00:00:00Z', dividend: 1.3, estimatedAmount: 13 }),
  ],
  '2026-6': [
    event({ symbol: 'AAPL', paymentDate: '2026-06-30T00:00:00Z', dividend: 0.24, estimatedAmount: 4.05 }),
    event({ symbol: 'MSFT', paymentDate: '2026-06-30T00:00:00Z', dividend: 0.75, estimatedAmount: 30 }),
  ],
  '2026-7': [event({ symbol: 'KO', paymentDate: '2026-07-15T00:00:00Z', dividend: 0.51, estimatedAmount: 20.4 })],
  // No payment date from the provider — placed by its ex-date instead.
  '2026-8': [
    event({ symbol: 'O', exDate: '2026-08-10T00:00:00Z', paymentDate: '0001-01-01T00:00:00Z', estimatedAmount: 7.5 }),
  ],
};

const prev = () => screen.getByRole('button', { name: 'Previous month' });
const next = () => screen.getByRole('button', { name: 'Next month' });
// The monthly total can equal an event row's amount, so scope lookups to the summary.
const summary = () =>
  within(screen.getByText('Estimated Monthly Total').closest('.dsm-summary') as HTMLElement);

describe('DividendScheduleModal', () => {
  beforeEach(() => {
    mocked.mockReset();
    mocked.mockImplementation(view => ({
      data: MONTHS[`${view.y}-${view.m}`] ?? EMPTY,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }));
    // Pin "today" so the current month and the nearest-upcoming-day default are deterministic.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 27)); // 2026-06-27 (local)
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens on the current month with the nearest upcoming day selected', () => {
    render(<DividendScheduleModal open onClose={() => {}} />);

    expect(screen.getByRole('heading', { name: 'June 2026' })).toBeInTheDocument();
    expect(mocked).toHaveBeenCalledWith({ y: 2026, m: 6 });
    // Nearest upcoming payout day is 2026-06-30 (two events).
    expect(screen.getByRole('heading', { name: /June 30/ })).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('MSFT')).toBeInTheDocument();
    expect(screen.getByText('$4.05')).toBeInTheDocument();
    expect(screen.getByText('$30.00')).toBeInTheDocument();
    expect(summary().getByText('$34.05')).toBeInTheDocument();
  });

  it('fetches and shows the next month', () => {
    render(<DividendScheduleModal open onClose={() => {}} />);

    fireEvent.click(next());

    expect(screen.getByRole('heading', { name: 'July 2026' })).toBeInTheDocument();
    expect(mocked).toHaveBeenCalledWith({ y: 2026, m: 7 });
    expect(screen.getByRole('heading', { name: /July 15/ })).toBeInTheDocument();
    expect(within(screen.getByRole('list')).getByText('KO')).toBeInTheDocument();
    expect(summary().getByText('$20.40')).toBeInTheDocument();
  });

  it('selects the first payout day of a past month', () => {
    render(<DividendScheduleModal open onClose={() => {}} />);

    fireEvent.click(prev());

    expect(screen.getByRole('heading', { name: 'May 2026' })).toBeInTheDocument();
    expect(mocked).toHaveBeenCalledWith({ y: 2026, m: 5 });
    // Nothing in May is upcoming, so the earliest day wins.
    expect(screen.getByRole('heading', { name: /May 12/ })).toBeInTheDocument();
    expect(within(screen.getByRole('list')).getByText('PG')).toBeInTheDocument();
    expect(summary().getByText('$23.50')).toBeInTheDocument();
  });

  it('drops a manually picked day when the month changes', () => {
    render(<DividendScheduleModal open onClose={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: '18' }));
    expect(screen.getByRole('heading', { name: /June 18/ })).toBeInTheDocument();
    expect(screen.getByText('No payouts on this day.')).toBeInTheDocument();

    fireEvent.click(next());
    expect(screen.getByRole('heading', { name: /July 15/ })).toBeInTheDocument();

    fireEvent.click(prev());
    expect(screen.getByRole('heading', { name: /June 30/ })).toBeInTheDocument();
  });

  it('keeps the calendar navigable in a month without payouts', () => {
    render(<DividendScheduleModal open onClose={() => {}} />);

    fireEvent.click(prev());
    fireEvent.click(prev());

    expect(screen.getByRole('heading', { name: 'April 2026' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'No day selected' })).toBeInTheDocument();
    expect(screen.getByText('No payouts this month.')).toBeInTheDocument();
    expect(summary().getByText('$0.00')).toBeInTheDocument();
    expect(prev()).toBeEnabled();
    expect(next()).toBeEnabled();
  });

  it('bounds navigation to 12 months either side of the current month', () => {
    const { unmount } = render(<DividendScheduleModal open onClose={() => {}} />);

    for (let i = 0; i < 12; i++) fireEvent.click(next());
    expect(screen.getByRole('heading', { name: 'June 2027' })).toBeInTheDocument();
    expect(next()).toBeDisabled();
    expect(prev()).toBeEnabled();

    unmount();
    render(<DividendScheduleModal open onClose={() => {}} />);

    for (let i = 0; i < 12; i++) fireEvent.click(prev());
    expect(screen.getByRole('heading', { name: 'June 2025' })).toBeInTheDocument();
    expect(prev()).toBeDisabled();
    expect(next()).toBeEnabled();
  });

  it('keeps the grid and arrows while a month is loading', () => {
    mocked.mockReturnValue({ data: undefined, isLoading: true, isError: false, refetch: vi.fn() });

    render(<DividendScheduleModal open onClose={() => {}} />);

    expect(screen.getByRole('heading', { name: 'June 2026' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '18' })).toBeInTheDocument();
    // The dialog renders in a portal, so look in the document rather than the container.
    expect(document.body.querySelector('.dsm-dot')).toBeNull();
    expect(document.body.querySelector('.dsm-skel--panel')).not.toBeNull();
    expect(screen.queryByText('No payouts this month.')).not.toBeInTheDocument();
    expect(summary().getByText('—')).toBeInTheDocument();
    expect(prev()).toBeEnabled();
    expect(next()).toBeEnabled();
  });

  it('treats a month with no data and no error as loading, not empty', () => {
    // What react-query reports for a fetch paused while offline.
    mocked.mockReturnValue({ data: undefined, isLoading: false, isError: false, refetch: vi.fn() });

    render(<DividendScheduleModal open onClose={() => {}} />);

    expect(document.body.querySelector('.dsm-skel--panel')).not.toBeNull();
    expect(screen.queryByText('No payouts this month.')).not.toBeInTheDocument();
    expect(summary().getByText('—')).toBeInTheDocument();
  });

  it('keeps showing a loaded month when a background refetch fails', () => {
    mocked.mockReturnValue({ data: MONTHS['2026-6'], isLoading: false, isError: true, refetch: vi.fn() });

    render(<DividendScheduleModal open onClose={() => {}} />);

    expect(screen.queryByText('Failed to load dividend schedule.')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /June 30/ })).toBeInTheDocument();
    expect(summary().getByText('$34.05')).toBeInTheDocument();
  });

  it('lists two payouts of the same symbol on one day', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocked.mockReturnValue({
      data: [
        event({ symbol: 'KO', paymentDate: '2026-06-30T00:00:00Z', estimatedAmount: 20.4 }),
        event({ symbol: 'KO', paymentDate: '2026-06-30T00:00:00Z', frequency: 'Special', estimatedAmount: 5 }),
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<DividendScheduleModal open onClose={() => {}} />);

    expect(within(screen.getByRole('list')).getAllByText('KO')).toHaveLength(2);
    // React reports duplicate keys through console.error.
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  it('ignores a row outside the viewed month', () => {
    mocked.mockReturnValue({
      data: [event({ symbol: 'AAPL', paymentDate: '2026-07-02T00:00:00Z', estimatedAmount: 4.05 })],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<DividendScheduleModal open onClose={() => {}} />);

    expect(screen.getByRole('heading', { name: 'June 2026' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'No day selected' })).toBeInTheDocument();
    expect(screen.getByText('No payouts this month.')).toBeInTheDocument();
    expect(summary().getByText('$0.00')).toBeInTheDocument();
  });

  it('offers a retry and keeps the arrows when a month fails to load', () => {
    const refetch = vi.fn();
    mocked.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch });

    render(<DividendScheduleModal open onClose={() => {}} />);

    expect(screen.getByText('Failed to load dividend schedule.')).toBeInTheDocument();
    expect(summary().getByText('—')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(refetch).toHaveBeenCalled();
    expect(prev()).toBeEnabled();
    expect(next()).toBeEnabled();
  });

  it('places an event without a payment date on its ex-date', () => {
    render(<DividendScheduleModal open onClose={() => {}} />);

    fireEvent.click(next());
    fireEvent.click(next());

    expect(screen.getByRole('heading', { name: 'August 2026' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^10, 1 payout$/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /August 10/ })).toBeInTheDocument();
    expect(within(screen.getByRole('list')).getByText('O')).toBeInTheDocument();
    expect(summary().getByText('$7.50')).toBeInTheDocument();
  });

  it('does not query while closed', () => {
    render(<DividendScheduleModal open={false} onClose={() => {}} />);

    expect(mocked).not.toHaveBeenCalled();
  });
});
