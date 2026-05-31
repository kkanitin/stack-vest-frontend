# Bug Report — `feature/polish`

**Tested:** 2026-05-23 | **Branch:** `feature/polish` | **Tester:** Claude (automated browser test)  
**Backend:** `http://localhost:8080` (running) | **Frontend:** `http://localhost:5173` (Vite dev)  
**Auth note:** Testing used a mock token. API calls returned 401, allowing error-state paths to be exercised.

---

## BUG-1 — Watchlist: error banner + empty state render simultaneously

**Severity:** High  
**File:** `src/pages/WatchlistPage.tsx:108`

### Observed
When the watchlist API returns an error (401/500), `watchlistStatus` becomes `'error'` and `entries` remains `[]`.
The JSX falls through to the `entries.length === 0` branch, rendering **both** the error banner and the
"Your watchlist is empty" empty state at the same time.

```
⚠ Failed to load watchlist
────────────────────────────────────
Your watchlist is empty
Add assets to track their performance over time.
[ + Add your first asset ]
```

### Root cause
```tsx
// WatchlistPage.tsx:106
{watchlistStatus === 'loading' ? (
  <div className="wl-empty">Loading watchlist…</div>
) : entries.length === 0 ? (   // ← true when error, no 'error' guard
  <div className="wl-empty">…Your watchlist is empty…</div>
) : (
  <div className="wl-table-wrap">…</div>
)}
```

### Fix
Add an `'error'` branch before the empty-state check:

```tsx
{watchlistStatus === 'loading' ? (
  <div className="wl-empty">Loading watchlist…</div>
) : watchlistStatus === 'error' ? null : entries.length === 0 ? (
  <div className="wl-empty">…</div>
) : (
  <div className="wl-table-wrap">…</div>
)}
```

The error banner (`displayError`) already handles user messaging; the `null` prevents the empty state from
showing when data was never loaded.

---

## BUG-2 — DCA Simulation: invalid SVG path when result is null

**Severity:** Medium  
**File:** `src/components/DCASimulation.tsx` — `GrowthChart` function (~line 57)  
**Console error:** `<path> attribute d: Expected moveto path command ('M' or 'm'), " L -648.0 230.0 L…"`

### Observed
After the DCA API call fails and `result === null`, `chartPoints` is `[]`. `GrowthChart` is still rendered
(skeleton is suppressed because `isLoading` is `false` in error state). With zero points, `valuePath`
is an empty string, so `areaPath` becomes ` L -648.0 230.0 L 48.0 230.0 Z` — a path that starts with
`L` instead of `M`, which is invalid SVG. The browser logs an error and renders nothing in the chart area.

### Root cause
```ts
// GrowthChart — areaPath construction
const areaPath = `${valuePath} L ${x(points.length - 1)...} L ${x(0)...} Z`;
// When points = [], valuePath = '', so path starts with ' L …'
```

### Fix
Guard `GrowthChart` for the empty case:

```tsx
function GrowthChart({ points }: { points: ChartPoint[] }) {
  if (points.length === 0) {
    return <svg viewBox="0 0 760 260" className="dca-chart" />;
  }
  // … existing code …
}
```

An empty `<svg>` renders nothing visually but avoids the invalid path error.

---

## BUG-3 — DCA Simulation: KPI strip shows misleading $0 values after API failure

**Severity:** Medium  
**File:** `src/components/DCASimulation.tsx:163–164`

### Observed
When the simulation API returns an error and no prior result exists (`result === null`), the KPI strip
renders all zeroes:

```
TOTAL INVESTED   CURRENT VALUE   ROI        AVG BUY PRICE
$0               $0              +0.00%     $0
```

The error banner above correctly says "Simulation failed", but the $0 values below are misleading —
a user may think they have $0 invested.

### Root cause
```ts
const isLoading = status === 'loading' || status === 'idle';
const showSkeleton = isLoading && result === null;
// When status === 'error': isLoading = false → showSkeleton = false
// KPI values fall back to: result?.totalInvested ?? 0 → 0
```

### Fix
Extend the skeleton condition to cover the error state when there is no prior result:

```ts
const showSkeleton = (isLoading || status === 'error') && result === null;
```

This shows the skeleton (grey bars) instead of zeros when the page first loads into an error state.
If the user previously had a successful result, `result !== null`, so the last-known values remain visible.

---

## INFO-4 — Overview: silent failure when portfolio APIs return errors

**Severity:** Low (UX)  
**File:** `src/components/Visualization.tsx:107–118`

### Observed
When all three portfolio endpoints fail (401/500), errors go only to `console.error`. The UI shows:
- TOTAL PORTFOLIO VALUE: `—`
- MARKET STATUS: hardcoded placeholder (always shows regardless)
- RECENT ACTIVITY: "No activity yet."
- The Allocation + Top Assets section disappears entirely (no error indicator)

A user cannot distinguish between "portfolio not set up yet" and "failed to load portfolio data".

### Suggested fix
Introduce an `error` state variable; display a dismissible inline banner when all three calls fail.
Alternatively, add per-card inline error text (e.g., "Could not load — Retry") alongside the `—` placeholder.

---

## INFO-5 — `VITE_API_URL` is empty in `.env.local`

**Severity:** Low (deployment risk)  
**File:** `.env.local:2`

`VITE_API_URL=` is empty. In development Vite proxies `/api/*` to `localhost:8080`, so this works.
In a production Cloudflare Pages build, the env var must be set to the real backend URL in the Cloudflare
Dashboard. If left empty, all API calls will point to a relative `/api/v1/…` path on the Pages domain,
which has no backend unless a Pages Function or reverse-proxy rule is configured.

**Action:** Set `VITE_API_URL` in Cloudflare Pages → Settings → Environment Variables before the next
production deploy.

---

## INFO-6 — "API Docs" footer link is a dead anchor

**Severity:** Low (cosmetic)  
**Observed:** Footer link `API Docs` resolves to `{current-url}#` on every page.

**Fix:** Either wire it to the real docs URL or remove the link until documentation is available.

---

## Summary table

| ID     | Severity | Page            | Description                                      | Status |
|--------|----------|-----------------|--------------------------------------------------|--------|
| BUG-1  | High     | Watchlist       | Error + empty state shown simultaneously         | Open   |
| BUG-2  | Medium   | DCA Simulation  | Invalid SVG path → console error when no data    | Open   |
| BUG-3  | Medium   | DCA Simulation  | KPI strip shows $0 instead of skeleton on error  | Open   |
| INFO-4 | Low      | Overview        | Portfolio errors fail silently (no user feedback)| Open   |
| INFO-5 | Low      | Deployment      | VITE_API_URL empty — deployment risk             | Open   |
| INFO-6 | Low      | All pages       | "API Docs" footer link is a dead anchor          | Open   |

---

## Pages tested

| Route                         | Renders | Error state        | Notes                              |
|-------------------------------|---------|--------------------|------------------------------------|
| `/login`                      | ✅      | n/a                | Google button renders correctly    |
| `/dashboard/visualization`    | ✅      | Silent (INFO-4)    | Hardcoded Market Status card       |
| `/dashboard/watchlist`        | ✅      | **BUG-1**          | Error + empty state overlap        |
| `/dashboard/dca`              | ✅      | **BUG-2, BUG-3**   | SVG error + $0 KPI strip           |
| `/dashboard/visualization/heatmap` | ✅ | Clean              | Error banner + Retry button work   |
| `/this-does-not-exist`        | ✅      | n/a                | 404 page renders correctly         |
| Add Asset modal               | ✅      | n/a                | Popular assets load (no auth req.) |
