# DCA Simulation — TODO Breakdown

Backtesting screen (`DCASimulation.tsx`), currently labelled "Beta". Two
TODOs: a placeholder simulation engine and a presentational button.

## Tasks

### S-1. Real DCA backtest engine
- **Marker**: `src/components/DCASimulation.tsx:9`
- **Tag**: `mock`
- **Current behaviour**: `runMockSimulation(amount, freq, start, end)`
  (lines 35–60) generates a deterministic upward-drift curve seeded by a
  sine/cosine oscillation. Only the BTC starting price (`26000`) is used —
  the `asset` selector (line 126) is ignored by the math.
- **Target behaviour**: Server-side backtest against real historical OHLC for
  the chosen `asset`.
- **Subtasks**
  1. Backend: `POST /simulations/dca` taking
     `{ symbol, amount, freq: 'weekly' | 'biweekly' | 'monthly', start, end }`
     and returning the existing `SimResult` shape (lines 27–33):
     `{ points: [{ invested, value, date }], totalInvested, currentValue, roi, avgBuyPrice }`.
  2. Add `src/api/simulations.ts` with `runDcaSimulation(token, params)`.
  3. Replace the `useMemo(runMockSimulation, [...])` call (line 132) with a
     debounced async fetch (~300ms) that mirrors the inputs into a request.
  4. Manage `idle | loading | success | error` status; render a skeleton in
     the `GrowthChart` and KPI strip while loading; surface errors in a
     non-blocking banner.
  5. Delete `runMockSimulation` once no consumers remain.
- **Acceptable to defer**: the Beta badge sets correct expectations and the
  shape of `SimResult` is stable, so the wire-up is mechanical when backend
  ships.

### S-2. Decide on the "Run Simulation" button
- **Marker**: `src/components/DCASimulation.tsx:197`
- **Tag**: `mock`
- **Current behaviour**: Button is presentational. The `useMemo` at line 132
  already recomputes on every input change, so results are always live.
- **Target behaviour**: One of —
  - **Remove**: drop the button (line 196) and the surrounding `// TODO`
    comment.
  - **Keep**: leave the button as a visual affordance and drop the TODO,
    OR repurpose it once S-1 lands so the user can force-rerun an expensive
    server call.
- **Subtasks** (whichever path is chosen)
  - Sync with design before deleting — the button is part of the form's
    visual rhythm.
  - If kept until S-1: have the button trigger the debounced server call
    immediately (skip the debounce).

## Verification
- After S-1: changing `asset` from BTC to ETH produces a visibly different
  growth curve (today it does not). Server-down case shows the error banner
  without blanking the form.
- After S-2 (remove path): grid layout unchanged; `dca-form` column still
  matches its right-side neighbour in height on desktop.

## File touchpoints
- `src/components/DCASimulation.tsx`
- (new) `src/api/simulations.ts`
