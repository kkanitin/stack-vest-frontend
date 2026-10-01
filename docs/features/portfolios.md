# Portfolios ("Strategies")

**Route:** `/dashboard/portfolios`
**Entry point:** `src/pages/PortfoliosPage.tsx`

Create, edit, and delete multiple named portfolios, each with a summary stats header. Mutations use optimistic updates.

## Components

| Component | Purpose |
|---|---|
| `PortfolioStatsHeader` | Aggregate stats across all portfolios; the change figure is coloured by its sign, neutral at zero |
| `PortfolioCard` | One card per portfolio, links to [Portfolio detail](./portfolio-detail.md) |
| `PortfolioFormModal` | Create / rename a portfolio |
| `AnalyzePortfolioModal` | Lazy-loaded [AI Strategy Analysis](./ai-strategy-analysis.md) |

## Data

| Hook / call | API |
|---|---|
| `usePortfolios` | `src/api/portfolios.ts` → `listPortfolios` |
| `usePortfoliosSummary` | `src/api/portfolios.ts` → `getPortfoliosSummary` |
| create / update | `createPortfolio`, `updatePortfolio` (in `PortfolioFormModal`) |
| delete | `deletePortfolio` |

## Limits

The number of portfolios per account is capped by `MAX_PORTFOLIOS` (`VITE_MAX_PORTFOLIOS`, default `10`). The UI disables creation at the cap; the server is the source of truth and returns `409` (surfaced as `PortfolioLimitError`). See [Architecture → Client-side limits](../architecture.md#client-side-limits).
