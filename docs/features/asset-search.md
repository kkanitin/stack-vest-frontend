# Global Asset Search

**Location:** topbar of the dashboard shell (`src/pages/LandingPage.tsx`), available on every dashboard route
**Entry point:** `src/components/TopbarSearch.tsx`

A topbar search that opens a detail modal with company profile stats and a price chart.

## Components

| Component | Purpose |
|---|---|
| `TopbarSearch` | Search input and results |
| `AssetDetailModal` | Company profile stats + price chart (also opened from the [Market heatmap](./market-heatmap.md)) |
| `AssetPriceChart` | Price history chart with selectable range |

## Data

| Hook | API |
|---|---|
| `useStockSearch` | `src/api/stocks.ts` → `searchStocks` |
| `useCompanyProfile` | `src/api/stocks.ts` → `getCompanyProfile` |
| `useStockHistory` | `src/api/stocks.ts` → `getStockHistory` |
