# Overview Dashboard

**Route:** `/dashboard/visualization` (the `/dashboard` index redirects here)
**Entry point:** `src/components/Visualization.tsx`

The user's holdings across every portfolio at a glance: total value with its recorded trend, how the holdings moved today, allocation, top holdings and recent activity. The market-wide **Fear & Greed Index** sits last as supporting context.

## Layout

| Row | Cards |
|---|---|
| Hero | `PortfolioValueCard` (wide) · `MarketStatusCard` |
| Holdings | Allocation (`AllocationDonut`) · `TopHoldingsCard` |
| Support | `RecentActivityCard` · Fear & Greed gauge · Fear & Greed signals |

With no holdings, or when holdings fail to load, the Holdings row is replaced by a single message card. The other rows stay.

## Components

| Component | Purpose |
|---|---|
| `PortfolioValueCard` | Total value, the 30-day change in percent and dollars, and the recorded trend |
| `PortfolioValueChart` | Line chart of recorded daily value with a range toggle (`30D`, `90D`, `1Y`, `All`); rendered inside `PortfolioValueCard` when the total is above zero |
| `MarketStatusCard` | "Your Holdings Today": up / down / flat counts (`src/utils/marketStatus.ts`) and the four biggest 24h movers |
| `AllocationDonut` | Share of total value per symbol; the five largest are named and the rest fold into "Other" |
| `TopHoldingsCard` | The five largest holdings with value, weight and 24h change |
| `RecentActivityCard` | The six newest position changes across all portfolios |
| `FearGreedGauge` | Fear & Greed Index gauge |
| `FearGreedSignals` | Breakdown of the signals driving the score |

## Data

| Hook | API |
|---|---|
| `usePortfoliosSummary` | `src/api/portfolios.ts` → `getPortfoliosSummary` (`GET /portfolios/summary`) |
| `usePortfolioValueHistory` | `src/api/portfolios.ts` → `getPortfolioValueHistory` (`GET /portfolios/history?range=`) |
| `useAllPositions` | `src/api/portfolios.ts` → `getAllPositions` (`GET /portfolios/positions`) |
| `useRecentActivity` | `src/api/portfolios.ts` → `getRecentActivity` (`GET /portfolios/activity?limit=`) |
| `useFearGreedIndex` | `src/api/sentiment.ts` → `getFearGreedIndex` |

Helpers: `src/utils/holdings.ts` (merging, allocation slices, movers), `src/utils/portfolioStats.ts` (`changeUsdFromPct`), `src/utils/format.ts` (`changeTone`, `fmtPct`, `fmtSignedMoney`, `fmtRelativeTime`), `src/utils/fearGreed.ts` (scoring).

## Behaviour to know

- **One holding per symbol.** `mergeHoldings` combines a symbol held in several portfolios before anything is counted, weighted or ranked.
- **One request each, never one per portfolio.** Positions and activity come from cross-portfolio endpoints. The backend allows a burst of 20 requests per user, and asking each of up to `MAX_PORTFOLIOS` portfolios separately would exceed it on a single page load.
- **Query keys sit under `['portfolios']`** (`'summary'`, `'history'`, `'positions'`, `'activity'`), so the invalidation that position and portfolio edits already fire refreshes the whole Overview.
- **Loading, empty and failed are three different states.** Each card distinguishes them; a failed holdings request never renders as "no holdings".
- **Two different "change" figures.** The 30-day change beside the total is `changePct` from the summary: today's share counts applied to prices 30 days ago. The dollar amount is derived from it on the client. The chart is the value the backend actually recorded each day. They can disagree whenever positions changed during the window, which is why the two are worded differently on the card.
- **The chart needs two recorded days.** The backend records the total every three hours and keeps one value per UTC day, starting the day recording began. With fewer than two points the card says so instead of drawing a chart, and a failed request shows "unavailable". Today's point can trail the live total by up to three hours.
- **Zero is neutral.** A change that displays as zero is shown unsigned and without the gain or loss colour (`changeTone`).

## Chart colours

Allocation slices use the categorical tokens `--series-1` … `--series-5` and `--series-other` from `src/index.css`, in that fixed order. They are separate from the semantic `--gain` / `--loss` colours so a slice never reads as a gain or a loss. The trend line uses `--primary`.
