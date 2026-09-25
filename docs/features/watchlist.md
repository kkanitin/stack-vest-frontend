# Watchlist

**Route:** `/dashboard/watchlist`
**Entry point:** `src/pages/WatchlistPage.tsx`

Track assets with 7-day sparklines and toggle per-symbol price alerts.

## Components

| Component | Purpose |
|---|---|
| `AddAssetModal` | Add an asset via search (`useStockSearch`) or from popular assets (`getPopularAssets`) |

## Data

| Hook / call | API |
|---|---|
| `useWatchlistQuotes` | `src/api/watchlist.ts` → `getWatchlist`, plus quotes/history from `src/api/stocks.ts` |
| add | `addToWatchlist` |
| remove | `deleteFromWatchlist` |
| toggle alerts | `setWatchlistAlerts` |

The same watchlist data powers the [Market heatmap](./market-heatmap.md).
