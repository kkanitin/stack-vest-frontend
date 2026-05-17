# Watchlist Heatmap Feature Plan

## Context

The StackVest frontend currently has a Visualization page with hardcoded placeholder data and no real watchlist functionality. The backend already exposes a `GET /api/v1/watchlist` endpoint that returns the user's saved stocks (symbol, name, type).

This plan adds a dedicated **Heatmap page** at `/dashboard/heatmap` that visualizes the user's watchlist as a color-coded grid — each tile representing one stock, colored green/red based on its daily price change percentage. The feature requires a new backend quote endpoint before any frontend work can be meaningfully completed.

---

## ⚠️ Prerequisite: Backend API Must Be Built First

The heatmap depends on price data that does not yet exist in any backend endpoint. **The frontend cannot show color-coded tiles until this API is available.**

### Required New Backend Endpoint

```
GET /api/v1/stocks/quote?symbol={symbol}
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "result": {
    "symbol": "AAPL",
    "open": "189.3000",
    "high": "191.0500",
    "low": "188.2200",
    "price": "190.4200",
    "volume": "55234100",
    "previousClose": "188.9800",
    "change": "1.4400",
    "changePercent": "0.7622%"
  },
  "code": 200,
  "message": "Success",
  "errorMessage": null
}
```

**Error Responses:**
```json
{ "result": null, "code": 404, "message": "Error", "errorMessage": "symbol not found" }
{ "result": null, "code": 429, "message": "Error", "errorMessage": "rate limit exceeded" }
{ "result": null, "code": 500, "message": "Error", "errorMessage": "upstream API error" }
```

**Backend implementation notes:**
- Source data from AlphaVantage `GLOBAL_QUOTE` function (already used for stock search)
- Map AV field names (`05. price`, `09. change`, `10. change percent`, etc.) to the flat shape above
- Apply the same JWT auth middleware as all other `/api/v1/` routes
- **Cache each symbol's response for ≥ 60 seconds** — the frontend fires N concurrent quote requests for N watchlist items, which would exceed AV's free tier limit (5 req/min, 25 req/day) on any non-trivial watchlist

---

## Frontend Implementation Plan

### Phase 1 — API Layer

**New file: `src/api/watchlist.ts`**

Mirrors the pattern in `src/api/users.ts`.

```typescript
export interface WatchlistItem {
  id: string;
  userId: string;
  symbol: string;   // "AAPL"
  name: string;     // "Apple Inc"
  type: string;     // "Equity"
  addedAt: string;  // ISO 8601
}

// getWatchlist(token: string): Promise<WatchlistItem[]>
//   → GET /api/v1/watchlist

// addToWatchlist(token, { symbol, name, type }): Promise<void>
//   → POST /api/v1/watchlist
```

**New file: `src/api/stocks.ts`**

```typescript
export interface StockQuote {
  symbol: string;
  open: string;
  high: string;
  low: string;
  price: string;
  volume: string;
  previousClose: string;
  change: string;
  changePercent: string; // e.g. "1.2300%" — strip "%" before parseFloat
}

// getStockQuote(token: string, symbol: string): Promise<StockQuote>
//   → GET /api/v1/stocks/quote?symbol=

// searchStocks(token: string, keywords: string): Promise<StockSearchResult[]>
//   → GET /api/v1/stocks/search?keywords=
```

---

### Phase 2 — Custom Hook

**New file: `src/hooks/useWatchlistQuotes.ts`**

Encapsulates all data fetching. Keeps the page component clean.

**Data flow:**
1. Fetch `getWatchlist(token)` — if it fails, surface the error and stop
2. On success, seed all entries as `status: 'loading'`
3. Fire `getStockQuote(token, symbol)` concurrently for every item via `Promise.allSettled`
4. Update each entry individually — a failed quote doesn't break other tiles
5. Record `lastUpdated: Date` timestamp when all settled
6. Expose `refresh()` callback for manual re-fetch

**State shape:**
```typescript
type QuoteStatus = 'idle' | 'loading' | 'success' | 'error';

interface WatchlistQuoteEntry {
  item: WatchlistItem;
  quote: { changePercent: number; change: number; price: number } | null;
  status: QuoteStatus;
  error: string | null;
}

// Returns: { entries, watchlistStatus, watchlistError, refresh, lastUpdated }
```

---

### Phase 3 — UI Components

**New file: `src/components/HeatmapTile.tsx`**

A `<button>` element (keyboard accessible, ready for future click-to-detail).

Tile layout:
```
┌─────────────────────┐
│ AAPL           Equity│  ← symbol (var(--mono), 16px bold) + type badge
│ Apple Inc            │  ← name (12px, truncated with ellipsis)
│                      │
│ +1.23%               │  ← changePercent (var(--mono), 18px bold, color-coded)
│ $190.42   +$1.44     │  ← price + absolute change (var(--mono), 11px, muted)
└─────────────────────┘
```

Tile color coding (inline `style`):
```typescript
function getTileStyle(changePercent: number | null): React.CSSProperties {
  if (changePercent === null) return {};
  const magnitude = Math.min(Math.abs(changePercent) / 5, 1); // caps at ±5%
  const alpha = magnitude * 0.18;
  const color = changePercent >= 0 ? '22, 163, 74' : '220, 38, 38'; // --success / --accent RGB
  return { background: `rgba(${color}, ${alpha})` };
}
```

| Tile state | Background | Change display |
|---|---|---|
| Loading | shimmer animation | skeleton bar |
| Quote error | `var(--card)` | `—` at 40% opacity |
| Positive | green tint (scaled by magnitude) | `+N.NN%` in `--success` |
| Negative | red tint (scaled by magnitude) | `-N.NN%` in `--accent` |
| Zero/flat | `var(--card)` | `0.00%` in `var(--text)` |

CSS conventions: `border-radius: 0` (sharp corners, matches existing cards), hover `translateY(-1px)` + `var(--shadow)`, `transition: 200ms cubic-bezier(0.4, 0, 0.2, 1)`. Styles injected via `<style>{S}</style>` template string — consistent with `Visualization.tsx`, `DCASimulation.tsx`, `LandingPage.tsx`.

---

**New file: `src/pages/HeatmapPage.tsx`**

Rendering decision tree:
```
watchlistStatus === 'loading'   → 8 skeleton tiles (prevents layout shift)
watchlistStatus === 'error'     → error banner + Retry button
entries.length === 0            → empty state card
entries.length > 0              → heatmap grid + toolbar
```

Grid layout:
```css
.heatmap-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 2px;
  background: var(--border); /* gap lines rendered as background showing through */
  border: 1px solid var(--border);
}
```

Toolbar row (above grid): stock count badge + "Refresh" button + "Last updated: HH:MM:SS" in `var(--mono)`.

---

### Phase 4 — Routing & Navigation

**Modify `src/App.tsx`:**
```tsx
import HeatmapPage from './pages/HeatmapPage';

// Inside /dashboard Route children:
<Route path="heatmap" element={<HeatmapPage />} />
```

**Modify `src/pages/LandingPage.tsx`:**
```tsx
// Add after DCA Simulation NavLink in sidebar <nav>:
<NavLink
  to="/dashboard/heatmap"
  className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
>
  <em className="sidebar-link-icon">⬛</em>
  Heatmap
</NavLink>
```

---

## Files Changed Summary

| File | Action | Notes |
|---|---|---|
| `src/api/watchlist.ts` | **Create** | `WatchlistItem` interface, `getWatchlist`, `addToWatchlist` |
| `src/api/stocks.ts` | **Create** | `StockQuote` interface, `getStockQuote`, `searchStocks` |
| `src/hooks/useWatchlistQuotes.ts` | **Create** | data-fetching hook, concurrent quote loading, refresh |
| `src/components/HeatmapTile.tsx` | **Create** | color-coded tile, skeleton, error states |
| `src/pages/HeatmapPage.tsx` | **Create** | page layout, all four render states |
| `src/App.tsx` | **Modify** | add `/dashboard/heatmap` child route |
| `src/pages/LandingPage.tsx` | **Modify** | add Heatmap nav link to sidebar |

---

## Verification Steps

1. `npm run dev` — start dev server
2. Log in via Google OAuth, navigate to `/dashboard/heatmap`
3. **Without backend quote API** — all tiles should show `—` (error state) rather than crashing
4. **With backend quote API** — tiles show real `+/-N.NN%` with green/red tints
5. "Refresh" button re-fetches all data
6. Empty watchlist → empty state card renders correctly
7. Responsive layout: grid reflows at viewport < 900px (sidebar collapses)
8. `npx tsc --noEmit` — no TypeScript errors
