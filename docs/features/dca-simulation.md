# DCA Simulation

**Route:** `/dashboard/dca`
**Entry point:** `src/components/DCASimulation.tsx`

Backtest dollar-cost averaging before committing real money.

## Inputs

- Asset: any asset the search finds (`AssetPicker`). The field shows the selected `TICKER — Name`; focusing it turns it into a search box, and picking a result re-runs the simulation. Defaults to AAPL.
- Amount per purchase (kept as text, so clearing the field is not turned into 0)
- Frequency: daily, weekly, bi-weekly or monthly
- Date range: opens on the three years ending today (UTC, matching the backend's "today")
- **Compare assets**: "+ Add an asset to compare" adds up to two more assets (three in all; the button is replaced by an explanation at the limit, and any asset can be removed with ×). A new slot starts on a suggested asset (not already chosen) for the user to replace by searching. An asset can appear only once. With extra assets the page calls `POST /dca/compare` once for all of them, and shows `DcaComparison`: a notice naming any asset left out and why, a percentage-return chart (`DcaCompareChart`, one line per asset, hover/tap readout, text alternative) with a legend, and a table with invested, final value, return and both yearly returns per asset. Every asset uses the same amount, frequency and range, so changing the plan updates them all in one request. The lump-sum option and the single-asset figures are hidden while comparing.
- **My holdings** (toggle at the top of the form): `HoldingsPicker` lists the user's portfolios; the chosen one's open positions are merged by symbol (`mergeHoldings`) and their current values become the weights, rounded to two decimals so the one-minute price refresh does not re-run the simulation unless an allocation really moved. A holding with no price is left out and named. The page calls `POST /dca/holdings` once however many holdings there are and shows `DcaHoldingsResult`: a visible note that the result is hypothetical (each purchase is split across today's assets at today's weights, it is not what the user bought, and today's weights favour assets that already did well), a notice naming holdings left out for missing history, the combined figures and growth chart, and a per-asset table (weight, invested, final value, return). A portfolio with no holdings, no priced holdings, or no portfolios at all shows a message and sends no request. The single-asset controls and the lump-sum option are hidden in this mode.
- **Compare with a lump sum** checkbox (off by default): adds a lump-sum line and legend entry to the chart, a tooltip row, and a panel with the lump sum's final value, its return, and the difference from DCA in dollars and as a share of the amount invested. A sentence states which approach did better. Calculated in the browser by `src/utils/dcaLumpSum.ts` from the `dataPoints` (no extra request): the DCA plan's total, bought at the first purchase's price and valued at each later price, so price movement only.

## Input checks

`src/utils/dcaInputs.ts` (`validateInputs`) runs on every render. A simulation runs only when: amount > 0, both dates are complete, end is not in the future, start is before end, and the range fits the frequency (daily 5 years, weekly 15, bi-weekly 20, monthly 30 — mirrors `maxDateRangeYears` in the backend handler).

An invalid input shows a message under its field and the Run button is disabled. No request is sent, the error banner is not used, and the last valid result stays on screen. The banner is only for failures from the API.

## Outputs

- ROI and KPIs (average buy price shown with cents)
- Two yearly returns side by side, each with a one-line note on how it is calculated: the simple one (total-capital CAGR, as before) and a money-weighted one (XIRR, each purchase counts from its own date). The money-weighted figure shows `n/a` when the backend cannot solve it.
- A price-basis line from the backend: results are price movement only, with no dividends reinvested.
- Growth chart (`DcaGrowthChart`: hand-drawn SVG sized with `useElementSize`, not Recharts). The x-axis is time-scaled with dates (three labels at phone width, five otherwise). Hovering, or tapping on a phone, shows the date, portfolio value and amount invested at the nearest point. The last point is the backend's closing point, so it equals Current Value. The SVG has an `aria-label` summarising the range, invested amount, final value and peak; the helpers are in `src/utils/dcaChart.ts`.
- If the backend has no price history for the asset and range (HTTP 404), the error banner says so instead of showing a generic failure.

## Components

| Component | Role |
|---|---|
| `src/components/AssetPicker.tsx` | Search-to-select field over `useStockSearch` (`GET /stocks/search`) |
| `src/components/DcaComparison.tsx`, `DcaCompareChart.tsx` | Asset comparison: skipped notice, percentage-return chart with legend, table (helpers in `src/utils/dcaCompare.ts`) |
| `src/components/HoldingsPicker.tsx`, `DcaHoldingsResult.tsx` | Holdings simulation: portfolio picker with current weights, and the combined result with per-asset table |
| `src/components/DcaSkippedNotice.tsx` | Names assets left out of a comparison or holdings simulation |
| `src/components/DcaGrowthChart.tsx` | Growth chart with dated axis, hover/tap readout and text alternative |

## Data

| Call | API |
|---|---|
| `runDcaSimulation` | `src/api/simulations.ts` (returns `DcaResult`; throws `DcaRequestError` carrying the HTTP `status`) |
| `compareDca` | `src/api/simulations.ts` (`POST /dca/compare`; returns `DcaComparison` with `results` and `skipped`) |
| `simulateDcaHoldings` | `src/api/simulations.ts` (`POST /dca/holdings`; returns `DcaHoldingsSimulation`) |
| `usePortfolios`, `usePortfolioPositionsById` | Portfolio list and positions behind `HoldingsPicker` |
| `useStockSearch` | `src/hooks/useStockSearch.ts` (debounced asset search, shared with the top bar) |
