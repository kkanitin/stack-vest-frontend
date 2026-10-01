import { API_BASE } from './config';

/** Mirrors the backend dividend calendar event for one of the user's held symbols.
 *  Dates are RFC3339 UTC strings with a zero time component — treat them as calendar
 *  dates (see `src/utils/dividendDate.ts`). A field the provider did not supply is
 *  serialized as the zero value `"0001-01-01T00:00:00Z"` (treat as absent). */
export interface DividendEvent {
  symbol: string;
  exDate: string;
  recordDate: string;
  paymentDate: string;
  declarationDate: string;
  dividend: number;
  adjDividend: number;
  yield: number;
  frequency: string;
  shares: number;
  estimatedAmount: number;
}

export interface DividendCalendarParams {
  from?: string;
  to?: string;
}

/** The largest page the endpoint serves. */
const PAGE_SIZE = 100;

/** `GET /dividends/calendar` — dividend payouts for the authenticated user's holdings
 *  whose reference date (payment date, else ex-date) falls within `from`..`to`. The
 *  endpoint honors the requested range, past months included, and is paginated: this
 *  walks every page and returns the rows concatenated, in the backend's order
 *  (reference date, then symbol). `signal` aborts the walk (a month stepped away from). */
export async function getDividendCalendar(
  token: string,
  params: DividendCalendarParams = {},
  signal?: AbortSignal
): Promise<DividendEvent[]> {
  const qs = new URLSearchParams();
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  qs.set('size', String(PAGE_SIZE));

  const events: DividendEvent[] = [];
  for (let page = 1; ; page++) {
    qs.set('page', String(page));
    const res = await fetch(`${API_BASE}/dividends/calendar?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    });
    const data = await res.json();
    if (!res.ok || data.code !== 200) {
      throw new Error(data.errorMessage || 'Failed to fetch dividend calendar');
    }
    const rows = (data.results ?? []) as DividendEvent[];
    events.push(...rows);
    // Stop on a short page or once `meta.total` is reached; without a total there is
    // nothing to page towards.
    const total = data.meta?.total;
    if (typeof total !== 'number' || rows.length < PAGE_SIZE || events.length >= total) {
      return events;
    }
  }
}
