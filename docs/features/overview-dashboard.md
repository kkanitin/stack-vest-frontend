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
| `PortfolioValueCard` | Total value, the 30-day time-weighted return in percent and dollars, Realised and Unrealised P&L, and the recorded trend |
| `PortfolioValueChart` | Line chart of recorded daily value with a range toggle (`30D`, `90D`, `1Y`, `All`) and a "Compare with" select (None or an index) that overlays a benchmark as percent change (the portfolio line is the ledger-based time-weighted return); rendered inside `PortfolioValueCard` when the total is above zero |
| `MarketStatusCard` | "Your Holdings Today": up / down / flat counts (`src/utils/marketStatus.ts`) and the four biggest 24h movers |
| `AllocationDonut` | Share of total value per symbol; the five largest are named and the rest fold into "Other" |
| `TopHoldingsCard` | The five largest holdings with value, weight and 24h change |
| `RecentActivityCard` | The six newest ledger buys and sells across all portfolios (BUY / SELL badge, symbol, quantity and price, portfolio name) |
| `FearGreedGauge` | Fear & Greed Index gauge |
| `FearGreedSignals` | Breakdown of the signals driving the score |

## Data

| Hook | API |
|---|---|
| `usePortfoliosSummary` | `src/api/portfolios.ts` → `getPortfoliosSummary` (`GET /portfolios/summary`) |
| `usePortfolioValueHistory(range, benchmark)` | `src/api/portfolios.ts` → `getPortfolioValueHistory` (`GET /portfolios/history?range=&benchmark=`; `benchmark` is sent only when set) |
| `useBenchmarks` | `src/api/portfolios.ts` → `getBenchmarks` (`GET /portfolios/benchmarks`) |
| `useAllPositions` | `src/api/portfolios.ts` → `getAllPositions` (`GET /portfolios/positions`) |
| `useRecentActivity` | `src/api/portfolios.ts` → `getRecentActivity` (`GET /portfolios/activity?limit=`) |
| `useFearGreedIndex` | `src/api/sentiment.ts` → `getFearGreedIndex` |

Helpers: `src/utils/holdings.ts` (merging, allocation slices, movers), `src/utils/portfolioStats.ts` (`changeUsdFromPct`), `src/utils/pctChangeSeries.ts` (percent-mode rows), `src/utils/format.ts` (`changeTone`, `fmtPct`, `fmtSignedMoney`, `fmtRelativeTime`), `src/utils/fearGreed.ts` (scoring).

## Behaviour to know

- **One holding per symbol.** `mergeHoldings` combines a symbol held in several portfolios before anything is counted, weighted or ranked.
- **One request each, never one per portfolio.** Positions and activity come from cross-portfolio endpoints. The backend allows a burst of 20 requests per user, and asking each of up to `MAX_PORTFOLIOS` portfolios separately would exceed it on a single page load.
- **Query keys sit under `['portfolios']`** (`'summary'`, `'history'`, `'positions'`, `'activity'`), so the invalidation that every transaction create / edit / delete (`useTransactionMutations`) and portfolio edit fires refreshes the whole Overview.
- **Recent activity comes from the ledger.** `GET /portfolios/activity` lists recorded buys and sells (badge `BUY` / `SELL`; a pre-ledger holding carried over reads "Opening balance"). With none, the card says "No recent activity." and "Record a buy or sell to see it here."
- **Loading, empty and failed are three different states.** Each card distinguishes them; a failed holdings request never renders as "no holdings". Open holdings only: fully sold holdings are left out of the Holdings row.
- **The 30-day change is a time-weighted return.** `changePct` from the summary is computed by the backend from the transaction ledger and excludes money added or withdrawn, so buying more at the current price does not move it. The dollar amount beside it is derived on the client (`changeUsdFromPct`). The card also shows **Realised** and **Unrealised** P&L (`realisedPnl`, `unrealisedPnl` from the summary) and a note that returns are now calculated from recorded transactions, so they may differ from before.
- **The chart needs two recorded days.** The backend records the total every three hours and keeps one value per UTC day, starting the day recording began. With fewer than two points the card says so instead of drawing a chart, and a failed request shows "unavailable". Today's point can trail the live total by up to three hours.
- **Benchmark overlay.** Off by default. The choice is kept per signed-in user in `localStorage` (`stackvest:benchmark:<userId>`, `useBenchmarkPreference`); a stored symbol missing from the `useBenchmarks` list, or read before that list has loaded, is ignored so the history request never carries a symbol the backend would reject with HTTP 400.
- **Two query keys.** History is `['portfolios', 'history', range, benchmark ?? 'none']`, under `['portfolios']`, so position edits refresh it. The benchmark list is `['benchmarks']` with `staleTime: Infinity`.
- **Percent mode plots returns, not value.** The portfolio line is the backend's cumulative time-weighted `returnPct` per point, rebased to 0% at the range start (`(100 + returnPct) / (100 + baseReturnPct) - 1`); the benchmark line is its `benchmarkClose` change from the same day (`src/utils/pctChangeSeries.ts`). The base is the first day where the portfolio value is above zero and `benchmarkClose` is a finite number (missing and null are the same); earlier days are dropped, and later days without a close are skipped. The note under the chart names that first day and says money added or withdrawn does not move the portfolio line.
- **Absolute view still includes deposits.** With no index selected the chart shows recorded total value in dollars, so money added or withdrawn counts as change there; the note under it says so.
- **Trading days.** The backend forward-fills `benchmarkClose` across weekends and holidays, so the benchmark line has a value on every recorded day. Index history is limited to 5 years, so `All` can start before the benchmark does and the percent chart starts at the first day with a close.
- **Unavailable index.** `benchmark.available: false` means the index data failed; no closes come back, so the chart stays in dollars and shows "{label} data is unavailable right now."
- **Zero is neutral.** A change that displays as zero is shown unsigned and without the gain or loss colour (`changeTone`).

## Chart colours

Allocation slices use the categorical tokens `--series-1` … `--series-5` and `--series-other` from `src/index.css`, in that fixed order. They are separate from the semantic `--gain` / `--loss` colours so a slice never reads as a gain or a loss. The trend line uses `--primary`. The benchmark overlay line uses `--benchmark` (a violet, distinct from `--primary`, `--gain` and `--loss`, defined for both themes) and is dashed so it is not told apart by colour alone.
