const DAY_MS = 24 * 60 * 60 * 1000;

/** Midnight-UTC timestamp for a YYYY-MM-DD date. */
export function dateMs(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

/** `count` dates (YYYY-MM-DD) spread evenly over [first, last], both ends included. */
export function axisDates(first: string, last: string, count: number): string[] {
  const a = dateMs(first);
  const b = dateMs(last);
  if (count < 2 || a >= b) return [first];
  return Array.from({ length: count }, (_, i) =>
    new Date(a + ((b - a) * i) / (count - 1)).toISOString().slice(0, 10)
  );
}

const MONTH = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });

/** Short axis label: "Jan 5" for ranges up to two years, "Jan '24" beyond that. */
export function formatAxisDate(date: string, first: string, last: string): string {
  const d = new Date(dateMs(date));
  const spanDays = (dateMs(last) - dateMs(first)) / DAY_MS;
  const month = MONTH.format(d);
  return spanDays > 730
    ? `${month} '${String(d.getUTCFullYear()).slice(2)}`
    : `${month} ${d.getUTCDate()}`;
}

/** Full date for the hover readout, e.g. "Jan 5, 2024". */
export function formatFullDate(date: string): string {
  const d = new Date(dateMs(date));
  return `${MONTH.format(d)} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** Index of the entry in ascending `times` closest to `t`. */
export function nearestIndex(times: number[], t: number): number {
  let lo = 0;
  let hi = times.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (times[mid] < t) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0 && t - times[lo - 1] <= times[lo] - t) return lo - 1;
  return lo;
}
