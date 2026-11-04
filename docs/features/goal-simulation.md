# Goal Simulation

**Route:** `/dashboard/goals/new` (`/dashboard/goals` redirects here until the saved-goals list exists)
**Entry point:** `src/pages/GoalCalculatorPage.tsx`
**Sidebar:** Goals

Plan toward a goal with investing. The DCA simulation looks back at real prices. This page looks forward at a steady return the user chooses. Everything is calculated in the browser; there are no API calls.

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
- Expected return a year (%): starts empty and must be typed in; 0% and negative returns are allowed
- Yearly increase in the monthly amount (%, optional)
- Inflation a year (%, optional, default 3)

Every field is kept as text, so clearing one is not turned into 0.

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
| `src/pages/GoalCalculatorPage.tsx`, `.css` | Page: form, mode switch, today's-money toggle, results |
| `src/utils/goalInputs.ts` | Form state shape, defaults, validation and parsing |
| `src/utils/goalResult.ts` | Turns parsed inputs into the figures and chart points the page shows |
| `src/components/ShortGoalNotice.tsx`, `.css` | Short-goal notice: plan versus cash for goals under 5 years (KAN-20) |
| `src/components/GoalGrowthChart.tsx`, `.css` | Growth chart: lines, low–high band, target line, readout, text alternative (KAN-19) |
| `src/utils/goalChart.ts` | Chart points at the three returns, axis ticks and labels, text alternative |
| `src/utils/goalMath.ts` | Projection, required monthly amount, range, today's money (KAN-17) |
| `src/utils/format.ts` (`fmtAmount`, `fmtRate`) | Amount with the currency label, whole units; a rate such as "7.25%" |

## Not yet

Saving goals (KAN-22) and the optional portfolio link with a suggested return (KAN-21) are separate tickets. Once goals can be saved, the short-goal notice must not stop the user saving one.
