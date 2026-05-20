# StackVest Design Alignment Plan

## Context

The repo at `C:\project\StackVest\frontend` ships an early SPA shell (auth, sidebar layout, Overview / Heatmap / DCA / Watchlist pages). Its current visual language was built around an editorial light theme (Bebas Neue + DM Sans, warm beige `#f5f0eb` background, red `#dc2626` accent, light-by-default with optional `prefers-color-scheme: dark`).

The newly-added `design-asset/` folder ships a final, finished design ("Quietly Premium" institutional-grade dark theme with Geist + JetBrains Mono, deep slate-blue surfaces, Deep Slate Teal `#2D5A64` primary). The seven PNGs (Login, Overview, Heatmap, DCA Simulation, Watchlist, Add Asset Search, design system) define the target screens precisely; `DESIGN.md` defines the token palette and rules.

**Goal:** Realign every existing screen to match the design-asset mockups. Replace the global theme, restructure each page's layout to match the mockup, fall back to clearly-marked mocked data only where there is no backend.

**User decisions:**
1. Scope: all screens redesigned. Mocked data OK where no API exists — every such spot must carry a `// TODO(mock): …` comment.
2. Theme mode: dark is default; preserve a light variant via `prefers-color-scheme: light`.
3. Accent: introduce `--primary` (teal) for brand/interactive; keep `--error` (red) for negative semantics only. Refactor existing red-accent usages over to `--primary`.

---

## Scope of Files

### Foundation (token + global layer)
- `src/index.css` — replace palette, fonts, base typography rules. Default = dark; `@media (prefers-color-scheme: light)` overrides.
- `index.html` — swap font preconnect/link from Bebas Neue + DM Sans to **Geist** + **JetBrains Mono**.
- `src/App.css` — audit for hardcoded colors; repoint to vars.

### Shell
- `src/pages/LandingPage.tsx` + `LandingPage.css` — repaint sidebar (deep slate, not pure black), rebrand block ("StackVest" wrap + "PREMIUM PORTFOLIO" caption), add "+ New Simulation" CTA above Settings/Log out, add "StackVest Institutional v2.4 / System Status / API Docs" footer, switch active-state border from red to `--primary`, replace emoji icons with simple geometric glyphs (or lucide-react if added).

### Pages
- `src/pages/LoginPage.tsx` + `LoginPage.css` — full restructure to centered card layout per `Login.png` (logo tile, "StackVest" headline, tagline, dark inset "Continue with Google" button card, footer with Privacy Policy / Terms of Service).
- `src/components/Visualization.tsx` + `Visualization.css` — keep "Welcome back, {firstName}." headline, restructure grid to: row 1 = Total Portfolio Value / Market Status / Recent Activity (3 cards); row 2 = Allocation (donut) / Top Assets (table). Mock the donut + Top Assets rows.
- `src/pages/HeatmapPage.tsx` + `HeatmapPage.css` — restructure to "Market Heatmap" headline + sub, segmented filter (All Assets / Top 100 / DeFi / L1s), timeframe pill (24H), Performance Scale legend, dense color-coded tile grid (red→neutral→teal). Keep `useWatchlistQuotes` data wiring; add mocked tiles to demonstrate the grid where watchlist is empty.
- `src/components/DCASimulation.tsx` + `DCASimulation.css` — replace the "Coming Soon" placeholder with a real layout: left "Simulation Parameters" form card (Target Asset, Amount per Interval `$`, Frequency Weekly/Bi-Weekly/Monthly toggle, Start/End date, Run Simulation button) + KPI strip (Total Invested / Current Value / ROI / Avg Buy Price) + "Portfolio Growth" line chart card. Use `recharts` (already feasible, light dependency) or an inline SVG chart with mocked data.
- `src/pages/WatchlistPage.tsx` + `WatchlistPage.css` — restructure to "Watchlist" headline + "+ Add Asset" button → table (Asset, Price, 24h Change, 7d Trend sparkline, Alerts toggle). Replace inline "search → add" UI with a modal triggered by "+ Add Asset" matching `Add Asset Search.png`. Sparkline + Alerts toggle use mocked data (mark with TODOs).
- (new) `src/components/AddAssetModal.tsx` + `.css` — modal with search input, "Suggested" list with `+` circular buttons. Replaces the inline search-row UI now in WatchlistPage.

### Reusable primitives (new, co-located CSS)
- `src/components/ui/Card.tsx` + `.css` — `Level 1` card (1px `#ffffff10` border, 8px radius, slate surface). Used everywhere.
- `src/components/ui/Button.tsx` + `.css` — variants: primary (teal solid), ghost, icon.
- `src/components/ui/Badge.tsx` + `.css` — pill, Beta variant, plus +/− pct chips.
- `src/components/ui/SegmentedControl.tsx` + `.css` — for Heatmap filter and DCA frequency.

### Docs/Skill alignment
- `skills/stackvest-ui/SKILL.md` — rewrite token + font section so it matches the new DESIGN.md (currently says "Inter + Mono", "Indigo accent", "8px radius" — all wrong for the new system). The skill should point at `design-asset/DESIGN.md` as the source of truth.

---

## Token Mapping (`src/index.css` rewrite)

Adopt the DESIGN.md frontmatter verbatim, but expose semantic aliases used today so we don't have to rename every consumer.

```css
:root {
  /* Surfaces */
  --bg: #0b1326;                 /* surface / background */
  --surface-low: #131b2e;        /* surface-container-low */
  --surface: #171f33;            /* surface-container */
  --surface-high: #222a3d;       /* surface-container-high */
  --surface-highest: #2d3449;    /* surface-container-highest */
  --card: var(--surface);

  /* Text */
  --text: #c0c8ca;               /* on-surface-variant */
  --text-h: #dae2fd;             /* on-surface */
  --text-dim: #8a9294;           /* outline */

  /* Brand */
  --primary: #a1ced9;            /* light teal — used on dark surfaces */
  --primary-strong: #2d5a64;     /* deep teal — solid CTA bg */
  --on-primary: #00363f;
  --primary-container: #2d5a64;

  /* Semantic */
  --success: #4ade80;
  --warning: #f2bb95;            /* tertiary */
  --error:   #ffb4ab;
  --loss:    #ffb4ab;            /* alias of error for table cells */
  --gain:    var(--success);

  /* Lines */
  --border: rgba(255,255,255,0.06);   /* "#ffffff10" */
  --border-strong: rgba(255,255,255,0.12);

  /* Fonts */
  --sans: 'Geist', system-ui, sans-serif;
  --heading: var(--sans);
  --display: var(--sans);           /* drop Bebas Neue */
  --mono: 'JetBrains Mono', ui-monospace, monospace;

  /* Radii */
  --r-sm: 2px;
  --r:    4px;     /* default */
  --r-md: 6px;
  --r-lg: 8px;     /* large cards */
  --r-pill: 9999px;

  /* Misc */
  --shadow-pop: 0 0 0 1px var(--border), 0 16px 32px rgba(0,0,0,0.4);
}

@media (prefers-color-scheme: light) {
  :root {
    /* High-contrast inverted token set (light variant kept per user decision). */
    /* TODO(design): final light palette not in mockups; derive from dark by inversion. */
  }
}
```

**Accent refactor (rename + split):**
- Every existing `var(--accent)` consumer in `LandingPage.css` (`.sidebar-link.active::before`, `.sidebar-badge`), `WatchlistPage.css`, `HeatmapPage.css`, `LoginPage.css`, `Visualization.css`, `DCASimulation.css` → repoint to `var(--primary)`.
- The variables `--accent`, `--accent-bg`, `--accent-border` stay as deprecated aliases that point to `--primary*` for one commit, then get removed.
- Negative-semantic uses (errors, "remove" buttons, loss pct chips) → repoint to `var(--error)` / `var(--loss)`.

---

## Page-by-Page Restructure Notes

### LandingPage (sidebar shell)
- Sidebar bg: `var(--surface-low)` (not pure `#0d0a07`); right border 1px `var(--border)`.
- Brand block: large "StackVest" wordmark using Geist 28px/600 over teal-tinted text-h color, caption "PREMIUM PORTFOLIO" in label-caps.
- Nav items: 8px radius, `--surface-highest` background on `.active`, left teal accent bar (`var(--primary)`), simple monoline icons (use `lucide-react`? confirm; otherwise small inline SVGs).
- Add prominent "+ New Simulation" button above Settings/Log out (primary teal solid).
- Replace `Sign Out` + avatar block with two-line "Settings" / "Log out" links (matches Overview.png + Watchlist.png).
- Topbar: drop "Dashboard" label + date; show only the StackVest wordmark on left + calendar icon + (Overview) avatar on right (per mockups).
- Footer: `StackVest Institutional v2.4` left, `System Status   API Docs` right.

### LoginPage
- Drop the current two-column `lp-left` / `lp-right` editorial layout entirely. Build a single centered 480-wide column on a near-black backdrop.
- Logo tile (rounded square, surface-high, monoline bank icon), 48px "StackVest" headline, 14px muted tagline ("A personal investment portfolio tracker. Built for clarity, precision, and the calm pursuit of long-term growth."), inset dark card containing the Google button + "Simple, secure Google sign-in." caption.
- Footer line: "Personal Side Project · Privacy Policy · Terms of Service".

### Visualization (Overview)
- "Welcome back, {firstName}." (28px headline).
- Grid row 1 (3 cards): **Total Portfolio Value** (huge `data-lg` value, +Δ$ chip), **Market Status** (Bullish Sentiment paragraph), **Recent Activity** (3 sparse rows with colored chips).
- Grid row 2 (2 cards, 1:2 ratio): **Allocation** (donut chart with "4 Assets" centered label + legend chips BTC/ETH/SOL/USDC) — TODO(mock) until backend; **Top Assets** (table: Asset / Balance / Value (USD) / 24h Change, monospace rows). TODO(mock) the table data.

### HeatmapPage
- Replace `hm-kicker` "Watchlist" + h1 "Heatmap" with `headline-md` "Market Heatmap" + sub "Real-time investment performance across tracked assets".
- Top-right toolbar: segmented control (All Assets / Top 100 / DeFi / L1s) + timeframe pill (`24H`). TODO(mock): tabs purely visual.
- Performance Scale gradient legend (5 swatches red → neutral → teal).
- Tile grid uses 4 background tints based on pct: hot-red, mute-red, neutral, mute-green, hot-teal. Symbol top-left (`label-caps`), price + pct on second row in JetBrains Mono. Reuse `HeatmapTile` but rewrite its CSS to match.
- Keep `useWatchlistQuotes` wiring; if watchlist empty, render mocked tiles labeled with TODO comment.

### DCASimulation
- Delete the "Coming Soon" placeholder content.
- Header: `headline-md` "DCA Simulation" + Beta pill (use `--primary` muted), sub line, "Export CSV" outline button right-aligned.
- Two-column layout:
  - **Left (440px) card "SIMULATION PARAMETERS"** — Target Asset select, Amount per Interval input (mono with `$` prefix), Frequency 3-button segmented control, Start/End date inputs side-by-side (mono), full-width teal "Run Simulation" button.
  - **Right** — KPI strip (4 mini cards: Total Invested / Current Value / ROI / Avg Buy Price) then "PORTFOLIO GROWTH" chart card with line chart (teal solid line = portfolio value, dashed = invested baseline). TODO(mock): chart data static array; full impl deferred to a backend ticket.
- Add chart via `recharts` if user agrees, else inline SVG `<polyline>` path. Default plan: inline SVG to avoid a new dep (confirm in review).

### WatchlistPage
- Header: `headline-md` "Watchlist" + sub "Track your high-conviction investment assets" + right-side "+ Add Asset" primary button.
- Replace inline search-row UI with a **table** (5 columns): Asset (icon + name/ticker), Price (mono), 24h Change (colored pct chip), 7d Trend (inline sparkline SVG), Alerts (toggle switch).
- TODO(mock): 7d sparkline data (random walk per item) and Alerts toggle state (local state only; no backend).
- Keep `getWatchlist` / `addToWatchlist` / `deleteFromWatchlist` wiring. Delete (X) lives in a row hover action.
- Asset add flow moves to `AddAssetModal` (next item).

### AddAssetModal (new)
- Triggered by "+ Add Asset" button. Backdrop = `rgba(0,0,0,0.5)`, panel = Level 2 surface, 8px radius.
- Header: "Add Asset" + close X. Sub-header: search input with magnifier icon (uses existing `searchStocks(token, keywords)`).
- Below input: "Suggested" section with hardcoded BTC / ETH / AAPL rows (TODO(mock) until a /suggestions endpoint exists), each row has a circular teal `+` icon button calling `addToWatchlist`. Live search results replace "Suggested" once the user types.

---

## Reusable Existing Functions / Components To Keep

- `useAuth()` (`src/context/AuthContext.tsx`) — every page still consumes it.
- `searchStocks` / `getWatchlist` / `addToWatchlist` / `deleteFromWatchlist` (`src/api/`) — keep, move to AddAssetModal.
- `useWatchlistQuotes` (`src/hooks/useWatchlistQuotes.ts`) — Heatmap data source, untouched.
- `HeatmapTile` (`src/components/HeatmapTile.tsx`) — keep component, rewrite tile CSS only.
- `ProtectedRoute` (`src/components/ProtectedRoute.tsx`) — untouched.
- `.counter` class (in `App.css`) — currently the de-facto button. Will get superseded by `<Button>` primitive but leave intact to avoid touching files we aren't redesigning.

---

## Implementation Order (Recommended)

1. **Foundation:** `index.html` (fonts) + `src/index.css` (tokens) + `src/App.css` audit. Verify dev server compiles and global font/colors flip.
2. **Shell:** `LandingPage` sidebar + topbar + footer. Verify every existing page still renders inside it without horizontal scroll.
3. **Login:** stand-alone, easy to verify in isolation.
4. **UI primitives:** Card, Button, Badge, SegmentedControl (only what's needed by the next pages).
5. **Visualization (Overview)** — most card-heavy, exercises Card + Badge.
6. **Watchlist** + **AddAssetModal** — exercises Modal + Table + Toggle.
7. **HeatmapPage** — re-skin tiles + add toolbar.
8. **DCASimulation** — biggest rebuild; do last.
9. **SKILL.md** doc update (matches what's actually now in the codebase).

---

## Verification

For each step:
- `npm run lint` clean.
- `npm run build` succeeds (catches type/CSS-import regressions).
- `npm run dev`, then manually compare each screen to its mockup at 1440px desktop width and at 768/375 mobile widths. The mockups assume desktop; mobile gets responsive collapse (sidebar already does).
- Auth: log in via Google → land on Overview → switch through sidebar tabs → open Add Asset modal → add/remove a real ticker via the live API → confirm Heatmap reflects the change.
- Dark/light parity: in DevTools, emulate `prefers-color-scheme: light` and confirm no token leaks (no pure-black text on dark surface, no white-on-white).
- Grep for any leftover `var(--accent)` / `'Bebas Neue'` / `'DM Sans'` / hardcoded `#dc2626`. None should remain.

---

## Out of Scope (Explicit)

- Backend changes (allocation, top-assets feed, DCA simulation engine, sparkline endpoint, alert subscriptions). Mocked with TODOs.
- Adding `recharts` or any chart library — current plan is inline SVG. If user wants `recharts`, decide before step 8.
- Mobile-first redesign of the Heatmap / DCA / Watchlist tables (existing responsive collapse is retained but not improved).
- Replacing emoji nav icons with an icon library — current plan keeps them as inline SVGs only on the sidebar; rest of UI stays emoji-free.
