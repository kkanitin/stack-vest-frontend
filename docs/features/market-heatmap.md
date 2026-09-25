# Market Heatmap

**Route:** `/dashboard/visualization/heatmap`
**Entry point:** `src/pages/HeatmapPage.tsx`

## View modes

| Mode | Component | Description |
|---|---|---|
| Heatmap | `HeatmapTile` | Colour-coded tiles with a mini sparkline |
| List | `SparklineList` / `SparklineRow` | Rows with sparklines |
| Performance | `PerformanceBarChart` | Performance bars |
| Compare | `ComparisonChart` | Multi-asset chart, normalised to base 100 (`src/utils/normalizeBase100.ts`) |

Clicking an asset opens `AssetDetailModal` (see [Global asset search](./asset-search.md)).

## Filters

- **Period:** 1D / 1W / 1M / YTD
- **Sector**

## Compare selection

The compare selection is persisted in the URL and capped by `VITE_MAX_COMPARE_ASSETS` (default `5`).

## Data

| Hook | API |
|---|---|
| `useWatchlistQuotes` | `src/api/watchlist.ts` + `src/api/stocks.ts` |
| `useSparklineData` | `src/api/stocks.ts` → `getBatchHistory` |
| `useComparisonData` | `src/api/stocks.ts` → `getBatchHistory` |
