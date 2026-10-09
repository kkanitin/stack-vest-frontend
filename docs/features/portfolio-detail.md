# Portfolio Detail

**Route:** `/dashboard/portfolios/:id`
**Entry point:** `src/pages/PortfolioDetailPage.tsx`

Holdings table, net value, 24h performance, unrealised and realised P&L, allocation usage, and the portfolio's transaction ledger: record buys and sells, review a holding's history, and remove a holding.

Holdings are derived from the ledger. There is no direct "edit a position" action any more; shares and average cost change only by recording, editing or deleting transactions.

## Components

| Component | Purpose |
|---|---|
| `TopAssetsTable` | Open holdings table (Buy / Sell / History / Delete per row, Unrealised P&L column) and, below it, the "Closed holdings" section |
| `EmptyPortfolioState` | Shown when the portfolio has neither open nor closed holdings |
| `TransactionFormModal` | Record a buy or sell, or edit an existing ledger row (symbol search via `useStockSearch` for a new asset). Replaces the old `PositionFormModal` |
| `HoldingHistoryDialog` | One holding's ledger, newest first, with edit / delete per row |
| `PortfolioFormModal` | Rename the portfolio |
| `AnalyzePortfolioModal` | Lazy-loaded [AI Strategy Analysis](./ai-strategy-analysis.md) |

### Stat cards

Total Net Value, 24h Performance, **Unrealised P&L** (with percent "on cost"), **Realised P&L** and Asset Allocation (slots used). The two P&L figures come from `src/utils/pnlTotals.ts`: `totalUnrealisedPnl` sums `unrealisedPnl` over open positions and expresses it as a percent of their summed `costBasis` (only priced holdings, `valueUsd > 0`, count toward the cost; no percent when that cost is zero); `totalRealisedPnl` sums `realisedPnl` over open and closed positions, because realised profit survives a full sale. The Realised card shows "—" while the closed-positions query loads or if it fails (a small notice with Retry appears above the holdings table, and the empty-portfolio state is withheld until that query succeeds). A holding with no market value shows "—" in the Unrealised P&L column, like Market Value.

### TransactionFormModal

- **Buy / Sell toggle.** The side is preselected from the row action (`initialSide`), `+ Add Asset` opens it on Buy.
- **Fields.** Date (defaults to today, `max` is today; a future date is rejected), quantity (> 0), price per share (>= 0), optional fee (>= 0) and optional note (200 characters). A live total sits above the buttons: "Total cost (fee included)" for a buy, "Net proceeds (after fee)" for a sell.
- **Symbol locked** on a row Buy / Sell and whenever a ledger row is being edited (a transaction's symbol cannot change). Only `+ Add Asset` shows the search box; a symbol with no search hit can still be used as typed.
- **Saving locks the modal.** While a save is in flight Cancel is disabled and Esc / overlay / close cannot dismiss it, so the result is always shown.
- **Server errors appear inline** in the form, including the `409` for a sell larger than the holding (or an edit that would leave a later sell short of shares). The server's message says which sell is affected.
- Title and submit label follow the mode: "Add Asset" / "Buy AAPL" / "Sell AAPL" / "Edit AAPL transaction"; "Record Buy", "Record Sell" or "Save Changes".

### HoldingHistoryDialog

Opened from the History action. Lists every ledger row for the symbol, newest first: side badge (BUY / SELL), date, quantity at price, fee (when above zero), note, shares held after the row (`runningShares`) and, on sells, the realised P&L. A row carried over from before the ledger existed is labelled "Opening balance". Each row has Edit (opens `TransactionFormModal` on that row; the dialog is hidden, not closed, while the edit is open and returns afterwards) and Delete (confirm dialog; a `409` from the server, when removing the row would leave a later sell short of shares, shows as a toast). Long histories load 100 rows at a time with a "Load more" button, and the dialog cannot be dismissed while a delete is in flight.

### TopAssetsTable

- **Open rows** are sorted by market value; the first five show, with "View All Holdings (N)" to expand. Actions are **Buy, Sell, History, Delete**. There is no Edit.
- **Unrealised P&L column** shows the dollar figure and percent per holding, coloured with `changeTone`.
- **Closed holdings section** (below the table, only when there are fully sold holdings) shows asset, ticker, realised P&L and the actions Buy, History and Delete (no Sell).
- **Delete wipes the entire history.** The confirm text says: "Delete {SYMBOL} from this portfolio? This also deletes its entire transaction history and realised P&L. This cannot be undone." The removal is optimistic on the open-positions cache and rolls back on error.

### Transactions card

Below the holdings: the portfolio's newest ledger rows across all holdings (BUY / SELL badge, date, symbol, "Opening balance" tag, quantity at price, realised P&L on sells). A select filters by symbol (all open and closed symbols, sorted); changing it resets the page size. Rows load 20 per page and "Show more" fetches the next page and appends it (hidden once the total is reached); the current list stays visible while a new filter loads. Empty ("No transactions yet.") and failed states are shown inline.

A portfolio whose holdings are all closed still shows the stat cards, the holdings table (empty) with the Closed holdings section, and the Transactions card; the empty-portfolio state appears only when there are no open and no closed holdings.

## Data

| Hook / call | API |
|---|---|
| `usePortfolio` | `src/api/portfolios.ts` → `getPortfolio` |
| `usePortfolioPositionsById` | `src/api/portfolios.ts` → `getPortfolioPositions` (open positions only), key `['portfolio', id, 'positions']` |
| `useClosedPositions` | `getPortfolioPositions(..., { includeClosed: true })` filtered to `closed`, key `['portfolio', id, 'positions', 'closed']` |
| `usePortfolioTransactions(id, { symbol })` | `useInfiniteQuery` over `src/api/transactions.ts` → `listTransactions` (`page` n, `size` 20), key `['portfolio', id, 'transactions', 'list', symbol ?? null]`; `data` is `{ transactions, total }` flattened across pages |
| `useHoldingTransactions(id, symbol)` | `useInfiniteQuery` over `listTransactions` with `symbol`, `size: 100` (the backend maximum), key `['portfolio', id, 'transactions', 'holding', symbol]`; `data` is the flattened rows |
| `useTransactionMutations(id)` | `createTransaction`, `updateTransaction`, `deleteTransaction` (returns `{ create, update, remove }`); settling invalidates `['portfolio', id]`, `['portfolios']` and `['dividendCalendar']` |
| remove holding | `removePortfolioPosition` (`DELETE /portfolios/{id}/positions/{symbol}`; deletes the whole history) |
| delete portfolio | `deletePortfolio` |

`src/api/transactions.ts` endpoints (all under `/portfolios/{id}/transactions`):

| Function | Request |
|---|---|
| `listTransactions` | `GET ?symbol=&page=&size=` → newest-first rows plus `meta.total` |
| `createTransaction` | `POST` `{ symbol, name, side, quantity, price, fee?, note?, date }` → `{ transaction, position }` |
| `updateTransaction` | `PATCH /{txId}` any of `side, quantity, price, fee, note, date` (never the symbol) → `{ transaction, position }` |
| `deleteTransaction` | `DELETE /{txId}` → 204 |

A `409` (open-position limit, or a sell larger than the holding) throws an `Error` carrying the server's `errorMessage`.

- **Positions list takes `includeClosed`.** `getPortfolioPositions` and `getAllPositions` add `?includeClosed=true` only when asked. `PortfolioPosition` carries `costBasis`, `unrealisedPnl`, `unrealisedPnlPct`, `realisedPnl` and `closed`.
- **Invalidation.** Every create, update and delete settles by invalidating `['portfolio', id]` (positions, transactions), `['portfolio', id, 'positions']` and `['portfolios']` (list, summary, history, activity, all-positions), so the Overview and Portfolios pages refresh too.
- **No position PATCH.** The `PATCH /portfolios/{id}/positions/{symbol}` call is gone from the client; the backend answers `410 Gone` ("Holdings are now edited through their transactions").

Stats helpers live in `src/utils/portfolioStats.ts` and `src/utils/pnlTotals.ts`. Gain / loss colouring and signs come from `changeTone` in `src/utils/format.ts`: a figure that displays as zero is neutral and unsigned.

## Limits

Open holdings per portfolio are capped by `MAX_ASSETS_PER_PORTFOLIO` (`VITE_MAX_ASSETS_PER_PORTFOLIO`, default `20`). The cap applies to `+ Add Asset` (disabled client-side at the cap, with a toast if triggered anyway) and to **Buy on a closed holding**, which reopens it as a new open position: the client does not pre-check that case, so the server's `409` is shown inline in the form. Closed holdings do not count toward the slots used. See [Architecture → Client-side limits](../architecture.md#client-side-limits).

Dates cannot be in the future (the picker's `max` is today's UTC date; the server also returns `400`).
