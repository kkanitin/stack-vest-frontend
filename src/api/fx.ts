/**
 * Today's exchange rate from one free, keyless source (Frankfurter, ECB reference rates),
 * used to show a linked portfolio's value in a goal's currency (KAN-27). Today's rate only:
 * no historical rates. ECB publishes once a working day, so `date` can be an earlier day.
 */

const DEFAULT_FX_API_URL = 'https://api.frankfurter.dev/v1';

export const FX_API_BASE = (import.meta.env.VITE_FX_API_URL || DEFAULT_FX_API_URL).replace(/\/+$/, '');

/** The ISO 4217 codes the ECB reference rates cover. */
export const FX_CURRENCIES: ReadonlySet<string> = new Set([
  'AUD', 'BGN', 'BRL', 'CAD', 'CHF', 'CNY', 'CZK', 'DKK', 'EUR', 'GBP', 'HKD', 'HUF', 'IDR',
  'ILS', 'INR', 'ISK', 'JPY', 'KRW', 'MXN', 'MYR', 'NOK', 'NZD', 'PHP', 'PLN', 'RON', 'SEK',
  'SGD', 'THB', 'TRY', 'USD', 'ZAR',
]);

/**
 * The ISO code for a free-text currency label ("thb " → "THB"), or null when the rates do
 * not cover it.
 */
export function fxCurrencyCode(label: string | null | undefined): string | null {
  const code = (label ?? '').trim().toUpperCase();
  return FX_CURRENCIES.has(code) ? code : null;
}

export interface FxRate {
  from: string;
  to: string;
  /** 1 `from` = `rate` `to`. */
  rate: number;
  /** The day the rate is for, `YYYY-MM-DD`. */
  date: string;
}

/** Today's rate from `from` to `to` (ISO codes). */
export async function getFxRate(from: string, to: string): Promise<FxRate> {
  const url = `${FX_API_BASE}/latest?base=${encodeURIComponent(from)}&symbols=${encodeURIComponent(to)}`;
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  const rate = data?.rates?.[to];
  if (!res.ok || typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
    throw new Error(data?.message || 'Failed to load the exchange rate');
  }
  return { from, to, rate, date: typeof data.date === 'string' ? data.date : '' };
}

/** "1 USD = 35.20 THB, 4 Nov 2026"; the date is left out when unknown. */
export function describeFxRate(fx: FxRate): string {
  const rate = fx.rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  const [y, m, d] = fx.date.split('-').map(Number);
  const day = y && m && d ? new Date(y, m - 1, d) : null;
  const when = day
    ? `, ${day.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : '';
  return `1 ${fx.from} = ${rate} ${fx.to}${when}`;
}
