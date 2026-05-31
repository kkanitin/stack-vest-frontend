# Market Heatmap — TODO Breakdown

Watchlist performance at a glance (`HeatmapPage.tsx`). Two TODOs: a
presentational filter, and a demo grid for the zero-watchlist case.

## Tasks

### ~~H-1. Wire the category filter (All / Top 100 / DeFi / L1s)~~ ✓ Done
- **Marker**: removed — `TODO(mock)` comment dropped from `src/pages/HeatmapPage.tsx`
- **Implemented**: `CATEGORY_MAP` maps `FilterValue` → backend category string
  (`'top100'` → `'Top 100'`, `'defi'` → `'DeFi'`, `'l1'` → `'L1s'`).
  `filteredTiles` filters on `e.item.category.includes(CATEGORY_MAP[filter])`.
  "No assets in this category" empty state shown when filter empties the grid.
- **Backend**: `category: string[]` added to `WatchlistItem` domain struct and
  returned by `GET /watchlist`.

### ~~H-2. Replace the empty-state demo grid~~ ✓ Done
- **Markers**: removed — `MOCK_TILES`, `makeMockChange`, `mockTile` helpers deleted.
- **Implemented**: `usePopularAssets(enabled)` hook (`src/hooks/usePopularAssets.ts`)
  fetches `GET /api/v1/popular`, then fans out `getStockPriceChange` per symbol
  to enrich tiles with live 24h data. `HeatmapPage` passes `showPopular` as the
  `enabled` flag; banner copy updated to "showing popular assets".
- **Backend**: `GET /api/v1/popular` returns 20 curated assets under `results`
  with `symbol`, `name`, `type`, `category[]`.

## Verification
- After H-1: clicking each segment changes the rendered tile count; "All"
  shows every watchlist item.
- After H-2: log out, log in as a user with no watchlist entries — tiles
  shown must come from `/popular`, not the hard-coded array.

## File touchpoints
- `src/pages/HeatmapPage.tsx`
- `src/api/watchlist.ts` (`category` added to `WatchlistItem`)
- `src/api/popular.ts` (new)
- `src/hooks/usePopularAssets.ts` (new)
