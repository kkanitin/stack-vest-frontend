# Dividend Calendar

**Location:** modal opened from the dashboard shell (`src/pages/LandingPage.tsx`)
**Entry point:** `src/components/DividendScheduleModal.tsx`

Dividend payouts for your holdings, one month at a time, with an estimated monthly total.

## Data

| Hook | API |
|---|---|
| `useDividendCalendar(view)` | `src/api/dividends.ts` → `getDividendCalendar` with `from`/`to` set to the viewed month (returns `DividendEvent[]`) |

- **One month per request.** The modal opens on the current month and `useDividendCalendar({ y, m })` fetches just that month (`monthRange` in `src/utils/dividendDate.ts` builds `from`/`to`). Stepping the calendar fetches the month it lands on; each month is cached under its own query key, with no placeholder data from the previous month.
- **Settle delay.** An uncached month is requested only after it has stayed in view for 250 ms (`SETTLE_MS` in the hook). Stepping on within that time aborts the request, so months passed through on the way are never fetched — each uncached month costs the backend several provider calls. Cached months show instantly.
- **All pages.** `getDividendCalendar` requests `size=100` and follows `page` until it has collected `meta.total` rows, stopping early on a short page or a response without `meta`.
- **Navigation.** The arrows are bounded to 12 months either side of the current month. They never depend on the query, so the grid and arrows stay usable while a month is loading, failed or empty — those states render in the side panel. A month with no data and no error counts as loading (this covers a fetch paused while offline); a failed background refetch keeps showing the month already loaded.
- **Placement.** Events sit on their reference date — the payment date, or the ex-date when the provider gave no payment date (`referenceKey`). The side panel defaults to the nearest upcoming payout day in the viewed month, else the month's first payout day.
- **Share count.** The backend sizes each payout from the transaction ledger. For past events it uses the shares held at the end of the day before the ex-date (the eligibility date); future events use the current share count. A symbol with no ledger rows falls back to the current share count. The estimated amount is those shares times the dividend per share.
- **Lifetime.** The query only runs while the modal is open: the body (`DividendBody`) unmounts on close, which also resets the viewed month and the selected day.
