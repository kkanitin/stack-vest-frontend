# Manual Test Checklist — Backlog Features

**Date:** 2026-05-23 | **Branch:** `feature/polish`  
**Purpose:** Verify current UI behaviour for every area in `todo-backlog.md`. Covers what is real, what is mock, and what edge-cases are visible to users.

> **Mock data note:** Items marked *(mock)* use placeholder data — verify the UI renders correctly and doesn't crash, not that numbers are real.

---

## 1. Watchlist

### 1.1 Price & 24h change
- [ ] Each row shows a price and a 24h % change badge
- [ ] Badge is green (positive) / red (negative) and the sign matches the number
- [ ] *(mock)* Last price value — accept any number; just confirm it isn't blank or `NaN`
- [ ] *(mock)* 7d sparkline — confirm the mini chart renders without console errors
- [ ] Remove one asset and re-add it; prices should reload for the new entry

### 1.2 Alert toggle
- [ ] Clicking the alert bell on a row toggles its icon state (on ↔ off)
- [ ] **Reload the page** — toggle should revert to off (persistence is not yet wired; this is expected behaviour, not a bug)
- [ ] Multiple rows can be toggled independently in the same session

### 1.3 Error & empty states
- [ ] Disconnect the backend (or set an invalid token) — only the error banner appears, **not** simultaneously with the empty-state message
- [ ] With backend restored, empty watchlist shows the "Add your first asset" CTA, not the error banner
- [ ] Loading spinner appears briefly before data arrives

---

## 2. Dashboard / Portfolio Visualisation

### 2.1 Total Portfolio Value tile
- [ ] *(mock)* Tile shows `$24,560.12` — confirm the value and +/− badge render
- [ ] Tile does not flicker or show a layout shift on load

### 2.2 Allocation donut
- [ ] *(mock)* Donut chart renders with coloured segments
- [ ] Hovering a segment shows a tooltip with the asset name and percentage
- [ ] Segments add up visually to 100 % (no gap or overlap)
- [ ] Legend items match the donut colours

### 2.3 Top Assets table
- [ ] *(mock)* Table shows rows with symbol, name, balance, value, and 24h change
- [ ] 24h change column has correct colour coding (green / red)
- [ ] Table scrolls or paginates gracefully if the list is long

### 2.4 Recent Activity feed
- [ ] *(mock)* Feed shows a list of timestamped transactions
- [ ] Entries are ordered most-recent first
- [ ] Buy / sell entries are visually distinct (colour, icon, or label)

---

## 3. Market Heatmap

### 3.1 Popular assets load (real API)
- [ ] Heatmap tiles populate from the live `/api/v1/popular` endpoint
- [ ] Each tile shows a symbol, price-change %, and colour (green → red scale)
- [ ] No "loading…" spinner hangs indefinitely

### 3.2 Category filter
- [ ] Category chips render across the top of the heatmap
- [ ] Selecting a chip filters tiles to that category only
- [ ] Selecting a category that has no assets shows the "No assets in this category" empty state — not a blank screen or a crash
- [ ] "All" / default chip restores the full grid

### 3.3 Empty watchlist state
- [ ] With no assets in the watchlist, the heatmap shows a sensible empty state (not a broken grid)

---

## 4. Add Asset Flow

### 4.1 Open modal
- [ ] Clicking "+ Add Asset" on the Watchlist page opens the modal
- [ ] Modal is correctly centred, has a close button (×), and closes on backdrop click

### 4.2 Suggested assets (mock)
- [ ] *(mock)* When the search input is empty, a static list of suggested assets appears
- [ ] Suggestions show symbol + name
- [ ] Clicking a suggestion populates the search or immediately triggers add

### 4.3 Search
- [ ] Typing in the search box filters or queries for matching assets
- [ ] No results state is shown when the query returns nothing
- [ ] Selecting a result and confirming adds the asset to the watchlist

### 4.4 Duplicate guard
- [ ] Attempting to add an asset already in the watchlist shows an error or is prevented

---

## 5. DCA Simulation

### 5.1 Inputs
- [ ] Symbol, amount, frequency, start date, and end date fields are all present and accept valid input
- [ ] Changing any input immediately updates the chart (no button press required — `useMemo` recomputes on change)
- [ ] Invalid input (e.g. end date before start date) shows an error and does not crash

### 5.2 Chart output (mock engine)
- [ ] *(mock)* Chart renders a curve after valid input — accept the deterministic drift shape
- [ ] Result summary shows final value, total invested, and gain/loss
- [ ] Gain is positive for the mock data (upward drift) — confirm colour coding is green

### 5.3 "Run Simulation" button
- [ ] Button is visible and clickable
- [ ] Note current behaviour: chart already updates on input change, so the button may feel redundant — flag if the button does nothing observable

### 5.4 Beta badge
- [ ] A "Beta" badge is visible on the DCA page or component header

---

## 6. Theming & CSS

### 6.1 Deprecated alias removal (T-1 — just shipped)
- [ ] Open DevTools → Elements; search for `--accent`, `--accent-bg`, `--accent-border`, `--social-bg`, `--code-bg` in the computed styles — none should appear anywhere in `:root`
- [ ] Inline `<code>` elements still have a visible background colour (was `--code-bg`, now `--surface-high` directly)
- [ ] No visible colour change across any page compared to before the cleanup

### 6.2 Dark theme (default)
- [ ] All surfaces, text, and borders use the dark palette — no pure white or black bleed
- [ ] Sidebar background is visually distinct from the main content area

### 6.3 Light theme (blocked — skip for now)
- [ ] *(blocked on design asset)* Skip until a light mockup lands in `design-asset/`

---

## Regression sweep (run after all sections above)

- [ ] Navigate to every route: Watchlist, Dashboard, Heatmap, DCA Simulation, a non-existent path (404)
- [ ] 404 page renders correctly and has a link back home
- [ ] No uncaught JS errors in the DevTools console on any page
- [ ] No broken layout at 1280 × 800 (laptop) and 375 × 812 (mobile)
- [ ] `npm run build` exits 0 (already verified post T-1, but confirm after any further edits)
