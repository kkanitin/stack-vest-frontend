# Goal Simulation

**Routes:** `/dashboard/goals` (saved goals), `/dashboard/goals/new` (new goal), `/dashboard/goals/:id` (a saved goal)
**Entry points:** `src/pages/GoalsPage.tsx` (list), `src/pages/GoalCalculatorPage.tsx` (calculator)
**Sidebar:** Goals (opens the list)

Plan toward a goal with investing. The DCA simulation looks back at real prices. This page looks forward at a steady return the user chooses. Every result is calculated in the browser. The API calls are for saved goals (the backend stores inputs only, see [Saved goals](#saved-goals)) and the optional portfolio link: the user's portfolios and a suggested return for the linked one.

## Saved goals

KAN-22, on the backend's goal storage API (KAN-15, `/goals`).

### API

`src/api/goals.ts`, behind `src/hooks/useGoals.ts` and `src/hooks/useGoalMutations.ts`:

| Call | Function | Hook / query key |
|---|---|---|
| `GET /goals?page=1&size=100` (list envelope, `results`) | `listGoals` | `useGoals`, `['goals']` |
| `GET /goals/:id` (`404` → `GoalNotFoundError`, not retried) | `getGoal` | `useGoal(id)`, `['goal', id]`; placeholder from the list |
| `POST /goals` (`201`; `409` → `GoalLimitError`) | `createGoal` | `useGoalMutations().create` |
| `PUT /goals/:id` (replaces every field) | `updateGoal` | `useGoalMutations().update` |
| `DELETE /goals/:id` (`204`) | `deleteGoal` | `useGoalMutations().remove` |

The backend caps goals at 50 a user and pages at up to 100, so one page holds them all. Each mutation writes the result into `['goal', id]` and `['goals']`, then refetches the list. Deleting a portfolio (Portfolios page or portfolio detail) also invalidates `['goals']` and `['goal']`, because the backend clears that portfolio's goal links.

### Form ↔ saved goal

`src/utils/savedGoal.ts`:

- `goalToDraft` loads a goal into the form as text (`null` and a 0 starting amount become empty fields) plus the portfolio link.
- `draftToBody` builds the request body: empty optional fields are `null`, no link is `null`. Both amounts are sent, so switching modes after loading loses neither; the amount the mode does not use is sent only when it is a positive number (the backend rejects a 0 target).
- `saveProblem`: the backend stores whole years only (1–100), so a goal with part years (e.g. 2.5) shows results but cannot be saved until Years is whole.
- `sameDraft` compares the form and link with what was last saved; that is the "unsaved changes" flag. The today's-money toggle is not saved.
- `goalHeadline` gives the list card's result.

### Goals list (`/dashboard/goals`)

`src/pages/GoalsPage.tsx` with one `src/components/GoalCard.tsx` per goal, newest first. A card shows the name, the mode ("How much will I have?" / "How much must I save?"), the years and the headline result in future money: the final value or the monthly amount needed ("Not reachable" when no amount reaches the target). It says "Linked to <portfolio>" when linked, or "Linked portfolio removed" once the portfolios have loaded and the linked one is not among them. The card opens the goal; **Delete** on the card asks in the card (`InlineConfirm`, not a browser dialog). With no goals there is an empty state with **Create your first goal**; otherwise a **+ New goal** button.

### Saving, loading and editing

- **New goal** (`/dashboard/goals/new`): **Save** is enabled once the form is valid and the years are whole. Saving creates the goal and replaces the URL with `/dashboard/goals/:id`.
- **Saved goal** (`/dashboard/goals/:id`): the page loads the goal (`useGoal`) and starts the calculator from it; the title is the saved name. Its expected return counts as typed by the user, so linking a portfolio shows the suggestion with **Use suggested** but never overwrites it. **Save changes** is enabled when something changed. After saving, the form shows the stored values (the backend trims the name and uppercases the currency). A missing goal shows "This goal does not exist" with a link to the list; other load errors offer **Try again**.
- A hint under the title says why saving is not possible (fix the highlighted fields, or use whole years). Save errors (e.g. the goal limit) are toasts and keep the changes.
- **Delete** on a saved goal asks in the page, then returns to the list.
- **Unsaved changes** are flagged next to the buttons. Leaving the page inside the app (sidebar, links, back) is held by `useBlocker` with an in-page prompt: **Stay** or **Leave without saving**. Closing or reloading the tab gets the browser's `beforeunload` prompt. The page's own moves after saving or deleting pass `{ goalSaved: true }` as navigation state to skip the prompt.
- **Linked portfolio deleted:** the backend clears the link when a portfolio is deleted, so a fresh goal simply has no link. If a goal still names a portfolio that is not in the user's list (e.g. loaded before the link was cleared), it still opens: the picker shows "Removed portfolio" with a note, no suggestion is asked for, and saving sends `portfolioId: null`.

## Modes

A toggle at the top of the form:

| Mode | User gives | Page shows |
|---|---|---|
| **How much will I have?** (`projection`) | Monthly amount, years, expected return | Final value |
| **How much must I save?** (`target`) | Target amount, years, expected return | Monthly amount needed |

Both amounts are kept when switching modes, so switching back does not lose what was typed.

## Inputs

- Goal name
- Currency: a free-text label (up to 10 characters, default `THB`). It is shown after every amount on the page and in the amount inputs, and is never used in a calculation; changing it changes no number.
- Starting amount (optional, empty = 0)
- Monthly amount (projection) or target amount (target)
- Years: decimals allowed (e.g. 2.5), up to 100; the maths rounds to whole months
- Expected return a year (%): starts empty and must be typed in, unless a linked portfolio suggests one (see [Portfolio link](#portfolio-link-and-suggested-return)); 0% and negative returns are allowed
- Link to a portfolio (optional, default "No portfolio")
- Yearly increase in the monthly amount (%, optional)
- Inflation a year (%, optional, default 3)

Every field is kept as text, so clearing one is not turned into 0.

## Portfolio link and suggested return

A **Link to a portfolio** picker above the years and expected-return fields (KAN-21): `src/components/GoalPortfolioLink.tsx`. It lists the user's portfolios (`usePortfolios`) after **No portfolio**, the default.

- **Linked:** `useSuggestedReturn` calls `GET /portfolios/:id/suggested-return` (`getSuggestedReturn` in `src/api/portfolios.ts`; backend KAN-16). The suggestion fills the expected-return field, and a line under the picker says where it came from, e.g. "Suggested 7.4% a year from your holdings, 2016–2026, price only." (`describeSuggestion` in `src/utils/suggestedReturn.ts`; the years come from `lookback`). The backend's `note` (e.g. short price histories) is shown under it.
- **Overwrite:** the user can type a different value. While the field differs from the suggestion, a **Use suggested** button puts it back.
- **Typed values are kept:** once the user types in the expected-return field, changing or removing the link never replaces that value; the new suggestion is only shown with **Use suggested**. An empty field counts as not typed and is filled.
- **Filled-in values follow the link:** a value the app filled in is cleared when the portfolio changes (then refilled from the new portfolio's suggestion) or when the link is removed, so it never shows another portfolio's figure.
- **Not linked:** no suggestion is asked for; the field is the user's to fill.
- **No suggestion** (`available: false`, e.g. no priced holdings): "No suggestion for this portfolio." with the backend's `note`; the field is left to the user.
- **Left-out holdings:** `skipped` is listed with `DcaSkippedNotice` ("Left out of the suggestion:"), with or without a suggestion.
- **Loading and errors** are notes under the picker only; nothing in the form is disabled. A failed suggestion offers **try again** (one automatic retry first); failing to load the portfolios still leaves "No portfolio" and the form usable.
- The suggestion is asked for only once the portfolio is known to be in the user's list (or the list failed to load), so a deleted portfolio is never asked for.
- The page tracks this with `portfolioId`, `returnTyped` and the last applied suggestion (`portfolioId:rate`), adjusting state while rendering like the last-valid-result logic. The query is cached for 10 minutes under `['portfolio', id, 'suggested-return']`, so transaction changes (which invalidate `['portfolio', id]`) refresh it.

## Input checks

`src/utils/goalInputs.ts` (`validateGoalInputs`) runs on every render, and `parseGoalInputs` turns valid text into numbers. Only the amount the current mode uses is checked. Rules: name required (≤ 100 characters); currency required (≤ 10 characters); starting amount ≥ 0; monthly or target amount > 0; years > 0, ≤ 100 and at least one month; expected return required; return, yearly increase and inflation between −50% and 50%.

An invalid field shows a message under it and is marked `aria-invalid`. Results appear only once every field is valid. After that, an invalid edit keeps the last valid result on screen, dimmed, with a note asking the user to fix the highlighted fields.

## Outputs

Calculated by `src/utils/goalResult.ts` (`computeGoalResult`) from the goal maths in `src/utils/goalMath.ts`. Results update as the user types.

- **Headline:** the final value (projection) or the monthly amount needed (target), at the expected return. In target mode, "Not reachable" when no monthly amount reaches the target, and a note when the starting amount already does (0 a month).
- **Figures:** total invested and growth (final value − total invested). Target mode also shows the final value the plan reaches.
- **Range:** the result at the low, expected and high returns (expected ∓ 2 percentage points, `RANGE_SPREAD_PCT`). In target mode a lower return needs a larger monthly amount.
- **Show in today's money** (off by default), using the inflation input:
  - Projection: every amount is divided by `(1 + inflation)^years`, i.e. what it would buy today.
  - Target: the target is taken as today's money and grown by inflation to the end of the plan, so the monthly amount needed is what the user actually pays. A note gives both figures; the other amounts stay in future money.
- A note under the results says which basis is shown.

## Short-goal notice

For goals under 5 years (`SHORT_GOAL_YEARS` in `src/utils/goalResult.ts`), a notice under the headline compares the plan with keeping cash: `src/components/ShortGoalNotice.tsx`. At 5 years or more it is not shown.

- **Figures:** `GoalResult.cashComparison` from `computeGoalResult`: the headline figure at the expected return, the same figure at a 0% return, and the difference. Target mode compares the monthly amounts needed (`requiredMonthlyAmount` at 0%); projection mode compares final values (`projectGoal` at 0%). Both use the same money basis as the headline, so they follow the today's-money toggle.
- **Text:** for example, "At 8% you need 24,670 THB a month. In cash you need 27,778 THB. Investing saves about 3,108 THB a month, but one bad year in the market could leave you short when you need the money." Amounts use the goal's currency label. When the expected return does no better than cash (0% or negative), the last sentence says so instead. When no monthly amount reaches the target, it gives the cash amount only.
- It is information only (`role="note"`): it never hides results or blocks anything.

## Growth chart

A **Growth over time** card between the figures and the range card: `src/components/GoalGrowthChart.tsx`, a hand-drawn SVG following the `DcaGrowthChart` pattern, sized to its box with `useElementSize`.

- **Lines:** amount invested (dashed), expected value (solid) and a shaded band between the low and high returns. In target mode a dashed horizontal line marks the target.
- **Data:** `GoalResult.chart` from `computeGoalResult`, built by `goalChartPoints` in `src/utils/goalChart.ts` on top of `goalSeries`: one point a year from today (year 0 is the starting amount), with a part-year point at the end when years is not whole. Target mode charts the plan at the monthly amount needed; there is no chart when the target cannot be reached.
- **Today's money:** follows the toggle the same way as the figures. Projection mode divides each point by `(1 + inflation)^year` for its own year, so the last point matches the headline. Target mode stays in future money and the target line sits at the target grown by inflation.
- **X-axis:** years ("Now", "Year 5", …) on a round step: up to 6 labels, 3 below 480 px wide. **Y-axis:** round gridlines (`valueTicks`) with short labels such as 1.25M (`fmtCompact`), no currency.
- **Readout:** hovering, or tapping on a phone, shows the nearest year, the amount invested and the value at the low, expected and high returns, with the currency label.
- **Text alternative:** the SVG's `aria-label` (`describeGoalChart`) gives the years, the amount invested, the expected final value with its low and high, and the target when there is one.

## Files

| File | Role |
|---|---|
| `src/pages/GoalCalculatorPage.tsx`, `.css` | Page: loads a saved goal or starts a new one; form, mode switch, today's-money toggle, results, save / delete / unsaved-changes prompt |
| `src/pages/GoalsPage.tsx`, `.css` | Saved-goals list, empty state, delete from the list (KAN-22) |
| `src/components/GoalCard.tsx`, `.css` | One saved goal: name, mode, years, headline result, linked portfolio, in-card delete confirmation |
| `src/components/InlineConfirm.tsx`, `.css` | In-page confirmation used for delete and for leaving with unsaved changes |
| `src/api/goals.ts` | `/goals` REST client: `listGoals`, `getGoal`, `createGoal`, `updateGoal`, `deleteGoal` |
| `src/hooks/useGoals.ts`, `src/hooks/useGoalMutations.ts` | Query hooks (`useGoals`, `useGoal`) and create / update / delete mutations |
| `src/utils/savedGoal.ts` | Saved goal ↔ form, request body, whole-years check, unsaved-changes comparison, list headline |
| `src/utils/goalInputs.ts` | Form state shape, defaults, validation and parsing |
| `src/components/GoalPortfolioLink.tsx`, `.css` | Portfolio picker, suggested-return line, "Use suggested", loading/error/no-suggestion notes (KAN-21) |
| `src/hooks/useSuggestedReturn.ts` | React Query hook for `GET /portfolios/:id/suggested-return` |
| `src/utils/suggestedReturn.ts` | Reads the suggested rate, formats it for the field and describes its source |
| `src/components/DcaSkippedNotice.tsx`, `.css` | Lists the holdings left out of the suggestion (shared with the DCA simulation) |
| `src/utils/goalResult.ts` | Turns parsed inputs into the figures and chart points the page shows |
| `src/components/ShortGoalNotice.tsx`, `.css` | Short-goal notice: plan versus cash for goals under 5 years (KAN-20) |
| `src/components/GoalGrowthChart.tsx`, `.css` | Growth chart: lines, low–high band, target line, readout, text alternative (KAN-19) |
| `src/utils/goalChart.ts` | Chart points at the three returns, axis ticks and labels, text alternative |
| `src/utils/goalProgress.ts` | Progress: months elapsed since `createdAt`, plan value to date (KAN-25); status and gap (KAN-26) |
| `src/api/fx.ts` | Today's FX rate (Frankfurter), supported ISO codes, rate description (KAN-27) |
| `src/hooks/useGoalProgress.ts` | Goal progress state from the goal, the linked portfolio's value and FX (KAN-28) |
| `src/hooks/useFxRate.ts` | Today's rate for a currency pair, fetched once a day per browser (KAN-27) |
| `src/utils/goalMath.ts` | Projection, required monthly amount, range, today's money (KAN-17) |
| `src/utils/format.ts` (`fmtAmount`, `fmtRate`) | Amount with the currency label, whole units; a rate such as "7.25%" |

## Progress

KAN-23: for a saved goal linked to a portfolio, how far along it is and whether it is on track.

### Plan to date

`src/utils/goalProgress.ts` (KAN-25) works out where the plan says the goal should be today, in future money at the goal's expected return (no today's-money conversion):

- **Start:** `goal.createdAt`, the only start date the backend stores. `updatedAt` is never used, so editing a goal does not move its start. (Open question: an explicit `startDate` from the backend would stop a re-created goal restarting its plan.)
- **Months elapsed** (`monthsBetween`): whole calendar months from the start to today; a month counts once its day of the month is reached. Capped at the goal's length.
- **Plan value** (`planValueAt`): the plan's value after that many months, from the starting amount, the monthly amount and the yearly increase (the same month-by-month maths as `projectGoal`). Projection mode uses the monthly amount; target mode uses the monthly amount needed (`requiredMonthlyAmount`, `goalPlanInputs`).
- `goalPlanToDate(goal, today)` returns the months elapsed, the total months, the plan value and the monthly amount, or null when there is no plan value (the target cannot be reached, or the amount the mode needs is missing).
- A goal created today is at its starting amount; a goal past its end date is at its final value.

### Status

`goalProgress(actual, plan, target?)` in the same file (KAN-26) compares the portfolio's value, already in the goal's currency, with the plan value today:

- **Status:** `on-track` when the value is within ±2% of the plan (`ON_TRACK_TOLERANCE_PCT`, edges included), so small price moves do not flip it; otherwise `ahead` or `behind`. A plan value of 0 has no band: 0 is on track, anything more is ahead.
- **Gap:** actual − plan, signed, in the goal's currency.
- **Percentages:** `percentOfPlan` (null when the plan is 0) and `percentOfTarget` (target mode; null without a positive target).
- **No status** (null) when there is no plan value or no portfolio value.

### Progress hook

`useGoalProgress(goal)` in `src/hooks/useGoalProgress.ts` (KAN-28) combines the goal, the linked portfolio's value and the FX rate for the goal card and the goal page. It returns one state:

| State | When |
|---|---|
| `not-linked` | No goal, or the goal has no portfolio link |
| `loading` | The portfolios, the portfolio detail or the FX rate are loading |
| `portfolio-removed` | The linked portfolio is not in the user's list |
| `unreachable` | No plan value (`goalPlanToDate` is null) |
| `no-value` | The portfolio has no value yet; with `retry` when loading it failed |
| `fx-unavailable` | `reason: 'unsupported'` (the goal's currency is not a code the rates cover) or `'error'` (the rate failed; with `retry`) |
| `ready` | `status`, `gap`, `percentOfPlan`, `percentOfTarget`, `actual` (in the goal's currency), `portfolioValue` and `portfolioCurrency`, `fx` (null in the same currency) and the `plan` |

- **Value:** `Portfolio.value` from `usePortfolios` (one request shared by every card); the portfolio detail (`usePortfolio`, `['portfolio', id]`) is asked for only when the list has no value.
- **Fresh values:** transactions already invalidate `['portfolios']` and `['portfolio', id]`, so progress follows them with no polling. FX is one query per currency pair.

### Currency conversion

When the goal's currency differs from the portfolio's, the portfolio value is converted at **today's rate only** (KAN-27), no historical rates:

- **Source:** `getFxRate` in `src/api/fx.ts`, `GET ${VITE_FX_API_URL}/latest?base=USD&symbols=THB` on Frankfurter (ECB reference rates, free, no key). ECB publishes once a working day, so the rate's date can be an earlier day.
- **Once a day:** `useFxRate(from, to)` in `src/hooks/useFxRate.ts` keeps the rate in `localStorage` for the calendar day and in the query cache for 24 hours, so each browser fetches a pair once a day. The same currency is rate 1 with no request. A failure retries once, then reports an error with a way to try again.
- **Codes:** the goal's currency is a free-text label, so it is converted only when `fxCurrencyCode` finds it among the ISO codes ECB covers (`FX_CURRENCIES`, e.g. THB, USD, EUR, JPY); anything else (e.g. "Baht") cannot be converted.
- **Shown as** `describeFxRate`: "1 USD = 35.20 THB, 4 Nov 2026".
- **Portfolio currency:** the API has no portfolio currency yet (`Portfolio.currency` is optional and assumed; `portfolioCurrency` in `src/api/portfolios.ts`); portfolio values are USD across the app (prices and trades are in USD), so USD is assumed until the backend exposes one.

## Not yet

The short-goal notice never stops the user saving a goal. The today's-money toggle is not saved with the goal.
