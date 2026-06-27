/** Calendar-date helpers for the dividend calendar.
 *
 *  Backend dates are RFC3339 UTC strings with a zero time component
 *  (e.g. `"2026-07-15T00:00:00Z"`). The contract is emphatic: treat them as **calendar
 *  dates** — take the `YYYY-MM-DD` prefix and ignore the time/zone. Never parse them
 *  with `new Date(iso)` and read date getters: for users west of UTC the midnight-UTC
 *  instant reads back as the previous day locally, dropping a payout onto the wrong cell.
 *  We slice the prefix to integers and only ever compare integers. */

export interface Ymd {
  y: number;
  m: number; // 1-12
  d: number;
}

/** The `YYYY-MM-DD` calendar key for an RFC3339 date string. */
export function ymd(iso: string): string {
  return iso.slice(0, 10);
}

/** A date the provider didn't supply is serialized as year `0001` — treat as absent. */
export function isAbsent(iso: string | null | undefined): boolean {
  return !iso || iso.startsWith('0001');
}

/** Parse the `YYYY-MM-DD` prefix into integer parts (no Date involved). */
export function parseYmd(iso: string): Ymd {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return { y, m, d };
}

/** Build a `YYYY-MM-DD` key from integer parts. */
export function makeKey(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Long heading for the side panel, e.g. "Monday, March 11". Safe because the Date is
 *  constructed from integers (local), not parsed from a UTC string. */
export function formatLongDate(y: number, m: number, d: number): string {
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/** "Month YYYY" label for the calendar header, e.g. "June 2026". */
export function formatMonthLabel(y: number, m: number): string {
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
