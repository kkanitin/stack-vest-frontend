# Overview Dashboard

**Route:** `/dashboard/visualization` (the `/dashboard` index redirects here)
**Entry point:** `src/components/Visualization.tsx`

Portfolio value, market status, and recent activity at a glance, plus a **Fear & Greed Index** gauge with a "what's driving this score" signal breakdown.

## Components

| Component | Purpose |
|---|---|
| `PortfolioValueCard` | Total portfolio value (`usePortfolioSummary`) |
| `MarketStatusCard` | Market open/closed status (`src/utils/marketStatus.ts`) |
| `RecentActivityCard` | Recent portfolio activity |
| `FearGreedGauge` | Fear & Greed Index gauge |
| `FearGreedSignals` | Breakdown of the signals driving the score |

## Data

| Hook | API |
|---|---|
| `useFearGreedIndex` | `src/api/sentiment.ts` → `getFearGreedIndex` |
| `usePortfolioSummary` | `src/api/portfolio.ts` → `getPortfolioSummary` |

Scoring helpers live in `src/utils/fearGreed.ts`.
