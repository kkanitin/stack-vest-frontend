# KAN-18 Goal calculator page (projection and target modes)

> **Status:** Implemented  
> **Created:** 2026-11-04  
> **Author:** Kanitin Krikriengsri  
> **Ticket:** [KAN-18](https://planplanster.atlassian.net/browse/KAN-18) · Epic idea: [KAN-14](https://planplanster.atlassian.net/browse/KAN-14)  
> **Branch:** `KAN-18-frontend-goal-calculator-page-projection-and-target-modes`

## Overview

Add a forward-looking goal calculator to the dashboard shell. Unlike the DCA simulation, which looks back at real price history, this page asks "what will I have?" (projection) or "how much must I save?" (target), and all results are worked out in the browser. KAN-18 covers the page, its form, input checks, results and the today's-money toggle. The maths (KAN-17), chart (KAN-19), short-goal warning (KAN-20), portfolio link (KAN-21) and saving (KAN-22) are separate tickets. This page is built so they plug into it.

## Goals

- `/dashboard/goals/new` renders the calculator inside the dashboard shell, lazy-loaded like the other routes, with a **Goals** sidebar entry.
- Mode switch: **"How much will I have?"** (`projection`) / **"How much must I save?"** (`target`).
- Inputs: name, currency label, starting amount, monthly amount (projection) or target amount (target), years, expected return, and optional contribution growth and inflation (default 3%).
- Results update as the user types: final value or monthly amount needed, total invested, growth, and the low / expected / high range.
- Today's-money toggle that deflates every shown amount by the inflation input.
- Input checks in `src/utils/goalInputs.ts`: a message under each invalid field, no results until all inputs are valid, and the last valid result stays on screen.
- Amounts kept as text in state, so clearing a field never becomes 0.
- The currency label appears next to every amount and is never used in calculations.
- Styles in `src/pages/GoalCalculatorPage.css`.
- `docs/features/goal-simulation.md` plus a row in `docs/features/index.md`.

## Non-Goals

- Saving, listing, loading, editing or deleting goals, and the `/dashboard/goals` list (KAN-22). `/dashboard/goals/:id` gets a route only if KAN-22 is not ready. See Open Questions.
- The growth chart and outcome band (KAN-19).
- The short-goal warning (KAN-20).
- The portfolio link and suggested return (KAN-21). The expected-return field starts empty, as the epic says for unlinked goals.
- Currency conversion, Monte Carlo or progress tracking (phases 2 and 3).

## Approach

### 1. Goal maths (KAN-17, merged in #36)

`src/utils/goalMath.ts` is already on main. The page uses:

- `projectGoal(ProjectionInputs) -> GoalProjection` and `projectRange(...)` for projection mode
- `requiredMonthlyAmount(TargetInputs) -> number | null` and `requiredMonthlyRange(...)` for target mode (`null` means unreachable: show a message, not a result)
- `toTodaysMoney(amount, years, inflationPct)` for the today's-money toggle
- `RANGE_SPREAD_PCT` (2) to label the low/high columns
- `goalSeries(...)` is left for the KAN-19 chart

### 2. Input checks: `src/utils/goalInputs.ts`

Follows `dcaInputs.ts`:

```ts
export type GoalKind = 'projection' | 'target';
export interface GoalFormInputs {
  kind: GoalKind;
  name: string; currency: string;
  startingAmount: string; monthlyAmount: string; targetAmount: string;
  years: string; expectedReturn: string;
  contributionGrowth: string; inflation: string;
}
export type GoalInputErrors = Partial<Record<keyof GoalFormInputs, string>>;
export const DEFAULT_INFLATION = '3';
export function validateGoalInputs(i: GoalFormInputs): GoalInputErrors;
export function parseGoalInputs(i: GoalFormInputs): GoalCalcInputs; // only called once valid
```

Rules, to match the KAN-15 backend validation:

- `name`: required.
- `currency`: required label of up to 10 characters.
- `startingAmount`: optional, empty = 0, ≥ 0.
- `monthlyAmount` (projection only): required, > 0.
- `targetAmount` (target only): required, > 0.
- `years`: required, > 0. Whole number or decimal? See Open Questions. Upper limit, e.g. 100.
- `expectedReturn`: required. Range check, e.g. −50 to 50 %.
- `contributionGrowth`: optional, empty = 0, range check.
- `inflation`: optional, empty = 0 (form default "3"), range check.

The field that is not used in the current mode is not checked, and its value is kept so switching modes back and forth does not lose it.

### 3. Page: `src/pages/GoalCalculatorPage.tsx` + `.css`

- State: one `GoalFormInputs` object of strings, plus `todaysMoney: boolean`.
- Every render runs `errors = validateGoalInputs(form)`. When it is valid, compute the result with `useMemo` (it is cheap and synchronous). The last valid result is kept in a ref or state, so invalid input keeps showing it, perhaps dimmed with an "Inputs incomplete, showing last result" note.
- Mode switch: the `ToggleGroup` used by DCA.
- Fields: `Input` and `Label` from `components/ui`, with `aria-invalid` and `aria-describedby` pointing at a `FieldError` (same pattern as DCA, with its own `.goal-field-error` class).
- Results panel: a headline figure (final value, or monthly amount needed), total invested, growth, and a three-column low / expected / high row, each with its return %. A today's-money switch with a one-line note ("in today's money at 3% inflation").
- Currency: a new `fmtAmount(n, currency)` in `src/utils/format.ts`. `fmtMoney` is hard-coded to `$`, so the new function gives `"1,234.56 THB"`. Every amount on the page goes through it.

### 4. Routing and sidebar

- `App.tsx`: `const GoalCalculatorPage = lazy(...)`. Add `goals/new` and, if decided, `goals` → `Navigate to="new"` until the KAN-22 list exists.
- `LandingPage.tsx`: a `NavLink to="/dashboard/goals/new"` with a new `Icon.Goals` (an inline SVG like the other icons), labelled **Goals**.

### 5. Tests (Vitest + Testing Library)

- `src/utils/goalInputs.test.ts`: each rule, mode-specific required fields, empty optional fields, and invalid numbers.
- `src/pages/GoalCalculatorPage.test.tsx`: renders both modes. Results update while typing. Clearing a field shows an error and keeps the last result. The today's-money toggle changes the figures. The currency label is on every amount.
- `format.test.ts`: `fmtAmount`.

### 6. Docs

- New `docs/features/goal-simulation.md`: route, entry point, inputs, input checks, outputs, components and data (no API calls yet).
- A row in `docs/features/index.md`.
- `docs/architecture.md`: the routing list, if it lists routes.

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Confirm the open questions below | Kanitin | [x] proposed defaults used (Jira comment), open to change in review |
| 2 | `src/utils/goalMath.ts` + tests (KAN-17) | — | [x] merged in #36 |
| 3 | `src/utils/goalInputs.ts` + `goalInputs.test.ts` | Claude | [x] |
| 4 | `fmtAmount(n, currency)` in `src/utils/format.ts` + test | Claude | [x] |
| 5 | `GoalCalculatorPage.tsx` + `GoalCalculatorPage.css`: form, mode switch, field errors | Claude | [x] |
| 6 | Results panel: headline, invested, growth, low/expected/high range, today's-money toggle, last valid result | Claude | [x] |
| 7 | Route in `App.tsx` (lazy) + **Goals** sidebar link and icon in `LandingPage.tsx` | Claude | [x] |
| 8 | `GoalCalculatorPage.test.tsx` | Claude | [x] |
| 9 | `docs/features/goal-simulation.md`, `docs/features/index.md` row, `docs/architecture.md` check | Claude | [x] |
| 10 | `npm run lint`, `npx vitest run`, `npm run build`, check in the browser at phone and desktop width | Claude | [x] |

## Dependencies

- **KAN-17** (goal calculation module): done, merged to main in #36.
- **KAN-15** (backend goal storage, Done): not called here, but the input rules should match its validation so saving in KAN-22 does not reject a goal that passed here.
- Later tickets build on this page: KAN-19 (chart), KAN-20 (warning), KAN-21 (portfolio link), KAN-22 (save/load, `/dashboard/goals/:id`).

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Rules here differ from the KAN-15 backend | Med | Med | Check the backend validation before finishing task 3, and list the rules in the docs page |
| `fmtMoney`'s `$` slips into goal amounts | Med | Low | All goal amounts use `fmtAmount`, and a test checks that no `$` appears for a THB goal |
| Range low return goes ≤ −100% or to 0% edge cases | Low | Med | Clamp or test in `goalMath`, with tests for 0% and negative returns |
| Today's money confused with nominal | Med | Med | Label the toggle state next to the results and state the inflation % used |
| Recomputing on every keystroke | Low | Low | The maths is O(months) and runs once per render under `useMemo`, so no debounce is needed |

## Open Questions

- [ ] Does `/dashboard/goals/:id` belong in KAN-18 (route only, no loading) or wait for KAN-22? Proposal: only `goals/new` here, plus `goals` redirecting to `new`.
- [ ] Should `years` allow decimals (e.g. 2.5) or whole years only? The backend accepts `> 0`.
- [ ] Should today's money be on by default? The epic suggests "show both, or default to today's money".
- [ ] Is the currency label free text or a short list (THB, USD, ...)?
- [ ] What should the sidebar label be: "Goals" or "Goal Planner"?

## References

- [KAN-18](https://planplanster.atlassian.net/browse/KAN-18), [KAN-14](https://planplanster.atlassian.net/browse/KAN-14) (epic idea), [KAN-17](https://planplanster.atlassian.net/browse/KAN-17), [KAN-19](https://planplanster.atlassian.net/browse/KAN-19)–[KAN-22](https://planplanster.atlassian.net/browse/KAN-22)
- `src/utils/dcaInputs.ts`, `src/components/DCASimulation.tsx` (validation and last-valid-result pattern)
- `docs/features/dca-simulation.md` (docs page template)
- `AGENTS.md` (CSS and docs rules)
