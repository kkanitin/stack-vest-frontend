# Market Heatmap

**Route:** `/dashboard/visualization/heatmap`
**Entry point:** `src/pages/HeatmapPage.tsx`

## View modes

| Mode | Component | Description |
|---|---|---|
| Heatmap (index source) | `IndexTreemap` | Market-cap treemap of an index, grouped by sector, coloured by change |
| Heatmap (watchlist source) | `HeatmapTile` | Colour-coded watchlist tiles with a mini sparkline |
| List | `SparklineList` / `SparklineRow` | Rows with sparklines |
| Performance | `PerformanceBarChart` | Performance bars |
| Compare | `ComparisonChart` | Multi-asset chart, normalised to base 100 (`src/utils/normalizeBase100.ts`) |

Clicking an asset (a treemap tile included) opens `AssetDetailModal` (see [Global asset search](./asset-search.md)).

## Heatmap sources

In Heatmap mode a **Source** toggle picks **S&P 500**, **Nasdaq 100**, **Dow 30** or **Watchlist**. The default is
S&P 500. The choice is persisted in the URL as `?source=`.

### Index treemap (`src/components/IndexTreemap.tsx`)

- **Layout:** `src/utils/treemapLayout.ts` runs a squarified two-level treemap from `d3-hierarchy`. Sectors come
  first, then stocks, with every area proportional to market cap.
  - Each sector reserves an 18px header for its label ("Technology ›").
  - The gaps are 4px between sectors and 1px between tiles.
- **Sizing:** the component measures its width with a `ResizeObserver`. Its height is landscape on desktop
  (`0.6 × width`, clamped to 480–860px) and portrait below 640px (`1.6 × width`).
- **Colour:** `perfLevel(pct, clamp)` in `src/utils/perfColor.ts` buckets a change into −3…+3. Each step is a third
  of the period's clamp in `PERIOD_CLAMP`: 1D ±3%, 1W ±6%, 1M ±10%, YTD ±30%.
  - The tile sets `data-level`, which maps to the `--itm-*` colour tokens in `HeatmapPage.css` (dark and light).
  - The legend shows the same steps for the current period.
- **Tile content scales with size:**
  - The largest tiles get a logo (`financialmodelingprep.com/image-stock/{SYMBOL}.png`; hidden if it fails to load),
    the symbol and the change.
  - Smaller tiles drop the logo, then the change, then the symbol.
- **Tooltip:** hovering or focusing a tile shows name, sector · sub-sector, price, market cap and all four periods.
- **Hidden controls:** the sparkline-lookback and category filter toggles only apply to the watchlist source, so
  they are hidden for index sources.
- **States:** a shimmer while the first request is loading, then "Building market map…" while the backend answers
  `503` (warming up after a restart). Any other error shows the error banner with a Retry button.

## Filters

- **Period:** 1D / 1W / 1M / YTD
- **Sector** (watchlist source only)

## Compare selection

The compare selection is persisted in the URL and capped by `VITE_MAX_COMPARE_ASSETS` (default `5`).

## Data

| Hook | API |
|---|---|
| `useIndexHeatmap` | `src/api/market.ts` → `getIndexHeatmap` (`GET /market/heatmap?index=`) |
| `useWatchlistQuotes` | `src/api/watchlist.ts` + `src/api/stocks.ts` |
| `useSparklineData` | `src/api/stocks.ts` → `getBatchHistory` |
| `useComparisonData` | `src/api/stocks.ts` → `getBatchHistory` |

`useIndexHeatmap` has a 2 min stale time and refetches every 5 min. On a `503` (`HeatmapWarmingError`) it retries
every 15 s, up to 20 times. Every period arrives in one response, so switching the period never refetches.

## Tests

`src/utils/treemapLayout.test.ts`, `src/utils/perfColor.test.ts`, `src/components/IndexTreemap.test.tsx`,
`src/components/HeatmapTile.test.tsx`
