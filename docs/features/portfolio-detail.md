# Portfolio Detail

**Route:** `/dashboard/portfolios/:id`
**Entry point:** `src/pages/PortfolioDetailPage.tsx`

Holdings table, net value, 24h performance, allocation usage, and add/edit/remove of individual positions.

## Components

| Component | Purpose |
|---|---|
| `TopAssetsTable` | Holdings table |
| `EmptyPortfolioState` | Shown when the portfolio has no positions |
| `PositionFormModal` | Add / edit a position (with symbol search via `useStockSearch`) |
| `PortfolioFormModal` | Rename the portfolio |
| `AnalyzePortfolioModal` | Lazy-loaded [AI Strategy Analysis](./ai-strategy-analysis.md) |

## Data

| Hook / call | API |
|---|---|
| `usePortfolio` | `src/api/portfolios.ts` → `getPortfolio` |
| `usePortfolioPositionsById` | `src/api/portfolios.ts` → `getPortfolioPositions` |
| remove position | `removePortfolioPosition` |
| delete portfolio | `deletePortfolio` |

Stats helpers live in `src/utils/portfolioStats.ts`. Gain / loss colouring and signs come from `changeTone` in `src/utils/format.ts`: a figure that displays as zero is neutral and unsigned.

## Limits

Assets per portfolio are capped by `MAX_ASSETS_PER_PORTFOLIO` (`VITE_MAX_ASSETS_PER_PORTFOLIO`, default `20`). See [Architecture → Client-side limits](../architecture.md#client-side-limits).
