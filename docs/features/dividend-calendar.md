# Dividend Calendar

**Location:** modal opened from the dashboard shell (`src/pages/LandingPage.tsx`)
**Entry point:** `src/components/DividendScheduleModal.tsx`

Projected payouts for your holdings, grouped by payment date, with an estimated monthly total.

## Data

| Hook | API |
|---|---|
| `useDividendCalendar` | `src/api/dividends.ts` → `getDividendCalendar` (returns `DividendEvent[]`) |

The query only runs while the modal is open (`useDividendCalendar(open)`).
