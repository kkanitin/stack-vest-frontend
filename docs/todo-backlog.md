# TODO Backlog

Open `// TODO(...)` markers in `src/`, grouped by product feature and ordered
within each group from highest to lowest impact. Source of truth is the inline
comment — keep the line reference up-to-date when files move.

Tag legend:
- `mock` — placeholder data / behaviour waiting on a real backend feed.
- `cleanup` — code that can be removed once a migration is finished.
- `design` — waiting on a design asset or decision.

Per-feature task breakdowns live in `docs/todos/`:

1. [x] [Watchlist](./todos/watchlist.md)
2. [x] [Dashboard / Portfolio Visualisation](./todos/dashboard-visualisation.md)
3. [x] [Market Heatmap](./todos/heatmap.md)
4. [x] [Add Asset Flow](./todos/add-asset-flow.md)
5. [x] [DCA Simulation](./todos/dca-simulation.md)
6. [x] [Theming & CSS Cleanup](./todos/theming-cleanup.md)

---

## 1. Watchlist
The primary tracking surface. Wrong numbers here are the most visible to users,
so these TODOs are the highest priority overall.

- **Real prices + 24h change** — `src/pages/WatchlistPage.tsx:9`
  Replace `mockMarket()` (deterministic from symbol hash) with the existing
  `useWatchlistQuotes` hook, which already calls
  `getStockPriceChange` (`src/api/stocks.ts:40`). `1D` from that response is the
  canonical 24h change.
  *Still mock after this:* last-price (endpoint returns % only) and the 7d
  sparkline series — needs `/stocks/{symbol}/quote` and
  `/stocks/{symbol}/history?range=7d`.
- **Per-row alerts persistence** — `src/pages/WatchlistPage.tsx:86`
  Toggle state is local-only and lost on reload. Needs backend support, either
  a dedicated `/watchlist/{symbol}/alerts` endpoint or an `alertsEnabled` flag
  on the existing watchlist item shape in `src/api/watchlist.ts`.

## 2. Dashboard / Portfolio Visualisation
Hero numbers on the landing dashboard. Static literals here erode trust quickly.

- **Total Portfolio Value tile** — `src/components/Visualization.tsx:108`
  `$24,560.12` is hard-coded. Needs `GET /portfolio/summary` returning
  `{ totalValue, change30d, changePct30d }` and a new `src/api/portfolio.ts`.
- **Allocation donut + Top Assets table** — `src/components/Visualization.tsx:7`
  `ALLOCATION` and `TOP_ASSETS` arrays (lines 17–37) are hard-coded. Needs
  `GET /portfolio/positions` (`[{ symbol, name, balance, valueUsd, change24h }]`);
  donut percentages derive client-side from `valueUsd / total`.
- **Recent Activity feed** — `src/components/Visualization.tsx:7` (same block)
  The `ACTIVITY` constant (line 46) needs a separate `/activity` feed. Can be
  deferred — it is a "nice to have" beside positions.

## 3. Market Heatmap ✓ Done
Tracks watchlist performance at a glance.

- ~~**Category filter**~~ — wired via `CATEGORY_MAP` + `filteredTiles`; `category[]`
  on watchlist items comes from backend. Empty-category state shows "No assets
  in this category."
- ~~**Empty-state demo grid**~~ — `MOCK_TILES` removed; `usePopularAssets` fetches
  `GET /api/v1/popular` and enriches with live price-change data.

## 4. Add Asset Flow
Modal triggered from the Watchlist "+ Add Asset" button.

- **Suggested popular assets** — `src/components/AddAssetModal.tsx:8`
  Static `SUGGESTED` array (lines 10–16) shown when the search input is empty.
  Replace with a `/suggestions` (or `/popular`) endpoint so product can update
  the list without a deploy.

## 5. DCA Simulation
Backtesting screen, currently labelled "Beta".

- **Real backtest engine** — `src/components/DCASimulation.tsx:9`
  `runMockSimulation` (line 35) produces a deterministic upward drift curve.
  Needs `POST /simulations/dca` taking `{ symbol, amount, freq, start, end }`
  and returning the existing `SimResult` shape (lines 27–33). Significant
  backend work; current behaviour is acceptable while behind the Beta badge.
- **"Run Simulation" button is presentational** — `src/components/DCASimulation.tsx:197`
  Already partly fulfilled — `useMemo` at line 132 recomputes on every input
  change. Decision needed: remove the button, or keep it for affordance and
  drop the TODO.

## 6. Theming & CSS Cleanup
Not user-facing; tidy-up work.

- **Drop deprecated `--accent*` aliases** — `src/index.css:39`
  `--accent`, `--accent-bg`, `--accent-border`, `--social-bg`, `--code-bg`
  (lines 38–44) are kept only for migration. Grep confirms no other file
  references them — safe to delete in a single commit.
- **Light palette fine-tuning** — `src/index.css:86`
  Light theme is currently derived by inverting the dark palette. Blocked on
  a light mockup in `design-asset/`.

---

## Cross-cutting backend dependencies
Several TODOs collapse onto a small set of missing endpoints. Shipping these
unblocks the bulk of the list:

| Endpoint                                  | Unblocks |
|-------------------------------------------|----------|
| `GET /stocks/{symbol}/quote`              | Watchlist real price |
| `GET /stocks/{symbol}/history?range=7d`   | Watchlist 7d sparkline |
| `GET /portfolio/summary`                  | Dashboard total tile |
| `GET /portfolio/positions`                | Allocation donut, Top Assets table |
| `GET /portfolio/activity`                 | Recent Activity feed |
| `GET /watchlist/alerts` (or item flag)    | Alerts persistence |
| `GET /popular` (or `/suggestions`)        | Heatmap empty state, Add Asset modal |
| `POST /simulations/dca`                   | DCA backtest |
