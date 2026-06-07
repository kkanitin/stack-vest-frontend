# Dashboard / Portfolio Visualisation — TODO Breakdown

Hero numbers on the landing dashboard (`Visualization.tsx`). Static literals
here erode trust the moment a user spots them. Second-highest priority after
Watchlist.

## Tasks

### D-1. Total Portfolio Value tile
- **Marker**: `src/components/Visualization.tsx:108`
- **Tag**: `mock`
- **Current behaviour**: Renders the literal `$24,560.12` with a hard-coded
  `+12.4%` / `+$2,720.00 · 30d` meta line (lines 109–113).
- **Target behaviour**: Render the user's actual total and 30d delta.
- **Subtasks**
  1. Backend: `GET /portfolio/summary` returning
     `{ totalValue: number, change30d: number, changePct30d: number }`.
  2. Add `src/api/portfolio.ts` with `getPortfolioSummary(token)`.
  3. Replace the hard-coded card body with fetched values; show a loading
     skeleton in the `viz-value` slot while pending.
  4. Format currency through the existing helper pattern (mirror `fmtMoney` in
     `DCASimulation.tsx:62`) or extract a shared `formatMoney`.
- **Interim option** if backend is blocked: derive client-side as the sum of
  positions returned by D-2.

### D-2. Allocation donut + Top Assets table
- **Marker**: `src/components/Visualization.tsx:7`
- **Tag**: `mock`
- **Current behaviour**: `ALLOCATION` (lines 17–22) and `TOP_ASSETS`
  (lines 32–37) are hard-coded constants.
- **Target behaviour**: Both feed off the user's real positions.
- **Subtasks**
  1. Backend: `GET /portfolio/positions` returning
     `[{ symbol, name, balance, valueUsd, change24h }]`.
  2. Add `getPortfolioPositions(token)` to `src/api/portfolio.ts`.
  3. Derive `ALLOCATION` client-side: `pct = valueUsd / Σ(valueUsd) * 100`,
     assign colours by ordinal (move the palette into a `const COLORS = [...]`).
  4. Pass the same positions array to the Top Assets table; remove the
     `TOP_ASSETS` constant.
  5. Handle the empty state (no positions): show a CTA pointing to the
     watchlist add flow.

### D-3. Recent Activity feed
- **Marker**: `src/components/Visualization.tsx:7` (same block as D-2)
- **Tag**: `mock`
- **Current behaviour**: `ACTIVITY` constant (line 46) lists three hard-coded
  rows (DCA purchase, rebalance, volatility alert).
- **Target behaviour**: Real audit feed of user actions and triggered alerts.
- **Subtasks**
  1. Backend: `GET /portfolio/activity?limit=10` returning
     `[{ id, label, detail, tone, badge, timestamp }]`.
  2. Wire into the existing `viz-activity` list (lines 126–137) — no UI change
     needed.
- **Deferrable**: lower-value than D-1 / D-2; can wait if the positions slice
  is too big to ship together.

## Verification
- After D-1: dashboard total tile equals `Σ valueUsd` of positions returned
  by D-2 (within rounding).
- After D-2: donut percentages sum to 100; Top Assets table row order matches
  `valueUsd` desc; empty state renders when no positions exist.

## File touchpoints
- `src/components/Visualization.tsx`
- (new) `src/api/portfolio.ts`
