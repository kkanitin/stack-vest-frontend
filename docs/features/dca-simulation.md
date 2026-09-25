# DCA Simulation *(Beta)*

**Route:** `/dashboard/dca`
**Entry point:** `src/components/DCASimulation.tsx`

Backtest dollar-cost averaging before committing real money.

## Inputs

- Asset
- Amount per purchase
- Frequency
- Date range

## Outputs

- ROI and KPIs
- Growth chart (Recharts; sized with `useElementSize`)

## Data

| Call | API |
|---|---|
| `runDcaSimulation` | `src/api/simulations.ts` (returns `DcaResult`) |
