# Watchlist — TODO Breakdown

The primary tracking surface. Wrong numbers here are the most visible to users,
so this feature carries the highest priority overall.

## Tasks

### W-1. Wire real prices and 24h change
- **Marker**: `src/pages/WatchlistPage.tsx:9`
- **Tag**: `mock`
- **Current behaviour**: `mockMarket(symbol)` (lines 19–39) hashes the symbol
  and derives a deterministic-but-fake price, 24h change, and 14-point series.
- **Target behaviour**: Reuse the existing `useWatchlistQuotes` hook
  (`src/hooks/useWatchlistQuotes.ts`), which already fans out
  `getStockPriceChange` (`src/api/stocks.ts:40`) per watchlist item. Use the
  `1D` field on the response as the canonical 24h change.
- **Subtasks**
  1. Import and call `useWatchlistQuotes` from `WatchlistPage.tsx`.
  2. Replace the `mockMarket(item.symbol)` call (line 155) with the matching
     `entry.priceChange` from the hook.
  3. Add per-row loading and error states — the hook already exposes
     `status` and `error` per entry.
  4. Delete the `hashSymbol`, `mockMarket`, `MockMarket` definitions once no
     consumers remain.
- **Remaining mock after this step** *(open new TODOs scoped to these only)*
  - Last price → needs `GET /stocks/{symbol}/quote`.
  - 7d sparkline series → needs `GET /stocks/{symbol}/history?range=7d`.

### W-2. Persist per-row alerts toggle
- **Marker**: `src/pages/WatchlistPage.tsx:86`
- **Tag**: `mock`
- **Current behaviour**: `alerts` is a `useState<Record<string, boolean>>`
  (line 87). Toggling updates local state only; reload wipes it.
- **Target behaviour**: Toggle state persists per user + symbol.
- **Subtasks**
  1. Backend: pick one of
     - dedicated endpoints `GET /watchlist/alerts` + `PUT /watchlist/{symbol}/alerts`, or
     - extend the existing watchlist item shape with `alertsEnabled: boolean`.
  2. Update `src/api/watchlist.ts` (`getWatchlist`, `addToWatchlist`) to
     read/write the flag.
  3. Replace the `alerts` local state with the value from
     `WatchlistItem.alertsEnabled`; on toggle, call the new API and update the
     row optimistically with rollback on error.
  4. Reuse the existing `wl-toggle` markup (lines 178–186) — no UI change.

## Verification
- Open `/watchlist` after W-1: the price and % shown for any symbol must match
  the same symbol's tile on `/heatmap` (both call `getStockPriceChange`).
- After W-2: toggle alerts on a row, hard-reload, state survives.

## File touchpoints
- `src/pages/WatchlistPage.tsx`
- `src/api/watchlist.ts`
- (new) `src/hooks/useWatchlistQuotes.ts` consumer in WatchlistPage
