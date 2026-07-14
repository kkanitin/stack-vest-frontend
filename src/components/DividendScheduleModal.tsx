import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDividendCalendar } from '../hooks/useDividendCalendar';
import type { DividendEvent } from '../api/dividends';
import { fmtMoney } from '../utils/format';
import { ymd, parseYmd, makeKey, formatLongDate, formatMonthLabel } from '../utils/dividendDate';
import './DividendScheduleModal.css';

interface DividendScheduleModalProps {
  open: boolean;
  onClose: () => void;
}

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MAX_DOTS = 3;

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

const DividendBody: React.FC<{ events: DividendEvent[] }> = ({ events }) => {
  // Group payouts by payment-date calendar key (sorting is preserved from the API,
  // which orders by paymentDate then symbol).
  const eventsByDay = useMemo(() => {
    const map = new Map<string, DividendEvent[]>();
    for (const ev of events) {
      const key = ymd(ev.paymentDate);
      const list = map.get(key);
      if (list) list.push(ev);
      else map.set(key, [ev]);
    }
    return map;
  }, [events]);

  const sortedKeys = useMemo(() => [...eventsByDay.keys()].sort(), [eventsByDay]);

  // Navigation bounds: today's month (no past data) → month of the last event.
  const todayView = useMemo<MonthView>(() => {
    const now = new Date();
    return { y: now.getFullYear(), m: now.getMonth() + 1 };
  }, []);
  const lastView = useMemo<MonthView>(() => {
    if (!sortedKeys.length) return todayView;
    const { y, m } = parseYmd(sortedKeys[sortedKeys.length - 1]);
    return { y, m };
  }, [sortedKeys, todayView]);

  // Nearest upcoming day with a payout (>= today), else the first available day.
  const initialKey = useMemo(() => {
    if (!sortedKeys.length) return null;
    const now = new Date();
    const todayKey = makeKey(now.getFullYear(), now.getMonth() + 1, now.getDate());
    return sortedKeys.find(k => k >= todayKey) ?? sortedKeys[0];
  }, [sortedKeys]);

  const [view, setView] = useState<MonthView>(() => {
    if (initialKey) {
      const { y, m } = parseYmd(initialKey);
      return { y, m };
    }
    return todayView;
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(initialKey);

  // Keep the initial selection aligned with the loaded data without clobbering the
  // user's navigation once they've interacted.
  const synced = useRef(false);
  useEffect(() => {
    if (synced.current || !initialKey) return;
    synced.current = true;
    const { y, m } = parseYmd(initialKey);
    setView({ y, m });
    setSelectedKey(initialKey);
  }, [initialKey]);

  const grid = useMemo(() => buildGrid(view), [view]);

  const monthlyTotal = useMemo(() => {
    const prefix = `${view.y}-${String(view.m).padStart(2, '0')}`;
    let total = 0;
    for (const ev of events) {
      if (ymd(ev.paymentDate).startsWith(prefix)) total += ev.estimatedAmount;
    }
    return total;
  }, [events, view]);

  const selectedEvents = selectedKey ? eventsByDay.get(selectedKey) ?? [] : [];
  const selectedHeading = useMemo(() => {
    if (!selectedKey) return null;
    const { y, m, d } = parseYmd(selectedKey);
    return formatLongDate(y, m, d);
  }, [selectedKey]);

  const viewIdx = monthIndex(view);
  const prevDisabled = viewIdx <= monthIndex(todayView);
  const nextDisabled = viewIdx >= monthIndex(lastView);

  const step = (delta: number) => {
    setView(v => {
      const idx = monthIndex(v) + delta;
      return { y: Math.floor(idx / 12), m: (idx % 12) + 1 };
    });
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
            const selected = cell.inMonth && cell.key === selectedKey;
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
          <h4 className="dsm-selected-date">{selectedHeading ?? 'No day selected'}</h4>

          {selectedEvents.length > 0 ? (
            <ul className="dsm-events">
              {selectedEvents.map(ev => (
                <li key={ev.symbol} className="dsm-event">
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
            <p className="dsm-no-events">No payouts on this day.</p>
          )}
        </div>

        <div className="dsm-summary">
          <span className="dsm-label">Estimated Monthly Total</span>
          <div className="dsm-total">{fmtMoney(monthlyTotal)}</div>
        </div>
      </aside>
    </div>
  );
};

const DividendScheduleModal: React.FC<DividendScheduleModalProps> = ({ open, onClose }) => {
  const { data, isLoading, isError, refetch } = useDividendCalendar();

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[1040px]">
        <DialogHeader>
          <DialogTitle asChild>
            <div className="dsm-title-wrap">
              <span className="dsm-title">Dividend Schedule</span>
              <span className="dsm-subtitle">Projected payouts for your portfolio</span>
            </div>
          </DialogTitle>
        </DialogHeader>
      <div className="dsm-body">
        {isLoading ? (
          <div className="dsm-state dsm-skel" />
        ) : isError ? (
          <div className="dsm-state dsm-error">
            <span>Failed to load dividend schedule.</span>
            <Button variant="outline" onClick={() => refetch()}>Retry</Button>
          </div>
        ) : data && data.length > 0 ? (
          <DividendBody events={data} />
        ) : (
          <div className="dsm-state dsm-empty">
            <span>No upcoming dividends for your holdings.</span>
          </div>
        )}
      </div>
      </DialogContent>
    </Dialog>
  );
};

export default DividendScheduleModal;
