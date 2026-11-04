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

## Files

| File | Role |
|---|---|
| `src/pages/GoalCalculatorPage.tsx`, `.css` | Page: form, mode switch, today's-money toggle, results |
| `src/utils/goalInputs.ts` | Form state shape, defaults, validation and parsing |
| `src/utils/goalResult.ts` | Turns parsed inputs into the figures the page shows |
| `src/utils/goalMath.ts` | Projection, required monthly amount, range, today's money (KAN-17) |
| `src/utils/format.ts` (`fmtAmount`) | Amount with the currency label, whole units |

## Not yet

Saving goals (KAN-22), the growth chart (KAN-19), the short-goal warning (KAN-20) and the optional portfolio link with a suggested return (KAN-21) are separate tickets.
