import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDividendCalendar } from '../hooks/useDividendCalendar';
import type { DividendEvent } from '../api/dividends';
import { fmtMoney } from '../utils/format';
import { parseYmd, makeKey, referenceKey, formatLongDate, formatMonthLabel } from '../utils/dividendDate';
import './DividendScheduleModal.css';

interface DividendScheduleModalProps {
  open: boolean;
  onClose: () => void;
}

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MAX_DOTS = 3;
/** How many months the arrows can travel either side of the current month. */
const MAX_MONTH_OFFSET = 12;
/** Stable stand-in while a month has no data yet (keeps the memos below from churning). */
const NO_EVENTS: DividendEvent[] = [];

interface MonthView {
  y: number;
  m: number; // 1-12
}

/** A single rendered cell in the 6×7 calendar grid. */
interface Cell {
  key: string;
  day: number;
  inMonth: boolean;
}

function monthIndex(v: MonthView): number {
  return v.y * 12 + (v.m - 1);
}

/** Build a 42-cell (6-week) grid for the given month, including dimmed leading/trailing
 *  days from the adjacent months. All dates are constructed locally from integers. */
function buildGrid(view: MonthView): Cell[] {
  const first = new Date(view.y, view.m - 1, 1);
  const firstWeekday = first.getDay(); // 0 = Sun
  const cells: Cell[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(view.y, view.m - 1, 1 - firstWeekday + i);
    cells.push({
      key: makeKey(date.getFullYear(), date.getMonth() + 1, date.getDate()),
      day: date.getDate(),
      inMonth: date.getMonth() === view.m - 1,
    });
  }
  return cells;
}

const DividendBody: React.FC = () => {
  // Today's month anchors the navigation bounds; today's key picks the default day.
  const { todayView, todayKey } = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    return { todayView: { y, m } as MonthView, todayKey: makeKey(y, m, now.getDate()) };
  }, []);

  const [view, setView] = useState<MonthView>(todayView);
  // The day the user picked in the viewed month; null until they pick one.
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // One month per request — stepping the calendar fetches the month it lands on.
  const { data, isError, refetch } = useDividendCalendar(view);
  // The backend returns only the requested month; filtering here keeps the grid, the
  // selection and the total in agreement even if a stray row slips through.
  const events = useMemo(() => {
    if (!data) return NO_EVENTS;
    const prefix = makeKey(view.y, view.m, 1).slice(0, 7);
    return data.filter(ev => referenceKey(ev).startsWith(prefix));
  }, [data, view]);
  // No data and no error means still loading — including a fetch paused while offline,
  // which react-query reports as neither loading nor failed. A failed background refetch
  // keeps showing the month it already has.
  const loading = data === undefined && !isError;
  const failed = data === undefined && isError;

  // Group payouts by reference-date calendar key (sorting is preserved from the API,
  // which orders by reference date then symbol).
  const eventsByDay = useMemo(() => {
    const map = new Map<string, DividendEvent[]>();
    for (const ev of events) {
      const key = referenceKey(ev);
      const list = map.get(key);
      if (list) list.push(ev);
      else map.set(key, [ev]);
    }
    return map;
  }, [events]);

  const sortedKeys = useMemo(() => [...eventsByDay.keys()].sort(), [eventsByDay]);

  // Nearest upcoming day with a payout (>= today), else the month's first payout day.
  const autoKey = sortedKeys.find(k => k >= todayKey) ?? sortedKeys[0] ?? null;
  const activeKey = selectedKey ?? autoKey;

  const grid = useMemo(() => buildGrid(view), [view]);

  const monthlyTotal = useMemo(
    () => events.reduce((total, ev) => total + ev.estimatedAmount, 0),
    [events]
  );

  const selectedEvents = activeKey ? eventsByDay.get(activeKey) ?? [] : [];
  const selectedHeading = useMemo(() => {
    if (!activeKey) return null;
    const { y, m, d } = parseYmd(activeKey);
    return formatLongDate(y, m, d);
  }, [activeKey]);

  // Bounded by the calendar alone, never by query state, so a slow, failed or empty
  // month can always be stepped away from.
  const viewIdx = monthIndex(view);
  const prevDisabled = viewIdx <= monthIndex(todayView) - MAX_MONTH_OFFSET;
  const nextDisabled = viewIdx >= monthIndex(todayView) + MAX_MONTH_OFFSET;

  const step = (delta: number) => {
    setView(v => {
      const idx = monthIndex(v) + delta;
      return { y: Math.floor(idx / 12), m: (idx % 12) + 1 };
    });
    setSelectedKey(null);
  };

  return (
    <div className="dsm">
      <section className="dsm-calendar" aria-label="Dividend calendar">
        <div className="dsm-cal-head">
          <h3 className="dsm-month">{formatMonthLabel(view.y, view.m)}</h3>
          <div className="dsm-nav">
            <button
              type="button"
              className="dsm-nav-btn"
              onClick={() => step(-1)}
              disabled={prevDisabled}
              aria-label="Previous month"
            >
              ‹
            </button>
            <button
              type="button"
              className="dsm-nav-btn"
              onClick={() => step(1)}
              disabled={nextDisabled}
              aria-label="Next month"
            >
              ›
            </button>
          </div>
        </div>

        <div className="dsm-weekdays">
          {WEEKDAYS.map(d => (
            <span key={d} className="dsm-weekday">{d}</span>
          ))}
        </div>

        <div className="dsm-grid">
          {grid.map((cell, i) => {
            const dayEvents = cell.inMonth ? eventsByDay.get(cell.key) : undefined;
            const selected = cell.inMonth && cell.key === activeKey;
            const dots = Math.min(dayEvents?.length ?? 0, MAX_DOTS);
            return (
              <button
                key={`${cell.key}-${i}`}
                type="button"
                className={`dsm-cell${cell.inMonth ? '' : ' dsm-cell--muted'}${selected ? ' dsm-cell--selected' : ''}`}
                disabled={!cell.inMonth}
                onClick={() => setSelectedKey(cell.key)}
                aria-pressed={selected}
                aria-label={
                  dayEvents
                    ? `${cell.day}, ${dayEvents.length} payout${dayEvents.length > 1 ? 's' : ''}`
                    : String(cell.day)
                }
              >
                <span className="dsm-cell-day">{cell.day}</span>
                {dots > 0 && (
                  <span className="dsm-dots">
                    {Array.from({ length: dots }, (_, j) => (
                      <span key={j} className="dsm-dot" />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <aside className="dsm-panel">
        <div className="dsm-panel-scroll">
          <span className="dsm-label">Selected Day</span>
          {loading ? (
            <div className="dsm-skel dsm-skel--panel" />
          ) : failed ? (
            <div className="dsm-panel-state">
              <span>Failed to load dividend schedule.</span>
              <Button variant="outline" onClick={() => refetch()}>Retry</Button>
            </div>
          ) : (
            <>
              <h4 className="dsm-selected-date">{selectedHeading ?? 'No day selected'}</h4>

              {selectedEvents.length > 0 ? (
                <ul className="dsm-events">
                  {selectedEvents.map((ev, i) => (
                    // A symbol can pay twice on one day (regular + special), so the
                    // symbol alone is not a unique key.
                    <li key={`${ev.symbol}-${i}`} className="dsm-event">
                      <div className="dsm-event-id">
                        <span className="dsm-event-symbol">{ev.symbol}</span>
                        <span className="dsm-event-freq">{ev.frequency || '—'}</span>
                      </div>
                      <div className="dsm-event-amounts">
                        <span className="dsm-event-total">{fmtMoney(ev.estimatedAmount)}</span>
                        <span className="dsm-event-share">{fmtMoney(ev.dividend)} / share</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="dsm-no-events">
                  {events.length > 0 ? 'No payouts on this day.' : 'No payouts this month.'}
                </p>
              )}
            </>
          )}
        </div>

        <div className="dsm-summary">
          <span className="dsm-label">Estimated Monthly Total</span>
          <div className="dsm-total">{loading || failed ? '—' : fmtMoney(monthlyTotal)}</div>
        </div>
      </aside>
    </div>
  );
};

const DividendScheduleModal: React.FC<DividendScheduleModalProps> = ({ open, onClose }) => {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[1040px]">
        <DialogHeader>
          <DialogTitle asChild>
            <div className="dsm-title-wrap">
              <span className="dsm-title">Dividend Schedule</span>
              <span className="dsm-subtitle">Dividend payouts for your holdings</span>
            </div>
          </DialogTitle>
        </DialogHeader>
      {/* Mounted only while the dialog is open: closing resets the viewed month and the
          selection, and nothing is fetched while closed. */}
      <div className="dsm-body">
        <DividendBody />
      </div>
      </DialogContent>
    </Dialog>
  );
};

export default DividendScheduleModal;
