# Features

StackVest is a single-page investment dashboard for retail investors: track holdings, watch the market, and backtest strategies before committing real money. All authenticated views live under the `/dashboard` shell (`src/pages/LandingPage.tsx`).

| Feature | Route | Entry point |
|---|---|---|
| [Overview dashboard](./overview-dashboard.md) | `/dashboard/visualization` | `src/components/Visualization.tsx` |
| [Portfolios](./portfolios.md) | `/dashboard/portfolios` | `src/pages/PortfoliosPage.tsx` |
| [Portfolio detail](./portfolio-detail.md) | `/dashboard/portfolios/:id` | `src/pages/PortfolioDetailPage.tsx` |
| [AI Strategy Analysis](./ai-strategy-analysis.md) | modal on portfolio pages | `src/components/AnalyzePortfolioModal.tsx` |
| [Market heatmap](./market-heatmap.md) | `/dashboard/visualization/heatmap` | `src/pages/HeatmapPage.tsx` |
| [DCA simulation](./dca-simulation.md) | `/dashboard/dca` | `src/components/DCASimulation.tsx` |
| [Watchlist](./watchlist.md) | `/dashboard/watchlist` | `src/pages/WatchlistPage.tsx` |
| [Global asset search](./asset-search.md) | topbar (all dashboard routes) | `src/components/TopbarSearch.tsx` |
| [Dividend calendar](./dividend-calendar.md) | modal from the dashboard shell | `src/components/DividendScheduleModal.tsx` |

See [Architecture](../architecture.md) for how features are wired (API layer → hooks → components).
