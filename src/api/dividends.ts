const API_BASE = `${import.meta.env.VITE_API_URL}/api/v1`;

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

/** `GET /dividends/calendar` — upcoming dividend payouts for the authenticated user's
 *  holdings (forward window of roughly today → today + 75 days). `from`/`to` narrow the
 *  view within that window; this UI omits them and filters client-side. */
export async function getDividendCalendar(
  token: string,
  params: DividendCalendarParams = {}
): Promise<DividendEvent[]> {
  const qs = new URLSearchParams();
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  const url = `${API_BASE}/dividends/calendar${qs.toString() ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (res.ok && data.code === 200) return data.results as DividendEvent[];
  throw new Error(data.errorMessage || 'Failed to fetch dividend calendar');
}
