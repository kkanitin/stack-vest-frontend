# Market Heatmap — TODO Breakdown

Watchlist performance at a glance (`HeatmapPage.tsx`). Two TODOs: a
presentational filter, and a demo grid for the zero-watchlist case.

## Tasks

### H-1. Wire the category filter (All / Top 100 / DeFi / L1s)
- **Marker**: `src/pages/HeatmapPage.tsx:67`
- **Tag**: `mock`
- **Current behaviour**: `SegmentedControl` updates `filter` state (line 50)
  but `tiles` (line 57) is built without consulting `filter` — clicking
  changes the chip selection only.
- **Target behaviour**: Each segment narrows the visible tiles to the matching
  category.
- **Subtasks**
  1. Pick a source of truth for tags:
     - **Preferred**: backend adds `category: string[]` to watchlist items;
       update `src/api/watchlist.ts` typings.
     - **Interim**: client-side map
       `const TAGS: Record<string, FilterValue[]>` in `HeatmapPage.tsx`.
  2. Filter `tiles` before render:
     `tiles.filter(e => filter === 'all' || e.tags.includes(filter))`.
  3. Show "No assets in this category" empty state when the filter empties
     the grid.

### H-2. Replace the empty-state demo grid
- **Markers**: `src/pages/HeatmapPage.tsx:19` and `src/pages/HeatmapPage.tsx:104`
- **Tag**: `mock`
- **Current behaviour**: `MOCK_TILES` (lines 35–44) plus the banner block
  (lines 103–107) render eight popular crypto symbols when the user's
  watchlist is empty.
- **Target behaviour**: Empty-state grid shows a real "popular" feed and the
  banner explains it.
- **Subtasks**
  1. Backend: `GET /popular` (or `GET /suggestions`) returning items shaped
     like `WatchlistEntry` (or transformable to it).
  2. Replace `MOCK_TILES` with a `usePopularAssets()` hook that calls the new
     endpoint.
  3. Keep the banner copy but drop the `// TODO(mock)` comment once the data
     is real.
  4. Delete the `makeMockChange`, `mockTile`, `MOCK_TILES` helpers when no
     consumers remain.

## Verification
- After H-1: clicking each segment changes the rendered tile count; "All"
  shows every watchlist item.
- After H-2: log out, log in as a user with no watchlist entries — tiles
  shown must come from `/popular`, not the hard-coded array.

## File touchpoints
- `src/pages/HeatmapPage.tsx`
- `src/api/watchlist.ts` (if backend adds `category`)
- (new) `src/hooks/usePopularAssets.ts` or similar
