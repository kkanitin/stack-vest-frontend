# Architecture

StackVest is a feature-complete SPA that talks to a separate REST API (part of the [StackVest monorepo](https://github.com/kkanitin/StackVest)) and authenticates users with Google.

## Stack

| Area | Choice |
|---|---|
| UI | React 19, TypeScript 6.0 |
| Build | Vite 8 (Rolldown bundler, Oxc transforms via `@vitejs/plugin-react`) |
| Routing | React Router 8 |
| Server state | TanStack Query 5 |
| Charts | Recharts 3 |
| Markdown | react-markdown |
| Auth | `@react-oauth/google` + `jwt-decode` (Google OAuth / One Tap) |
| Testing | Vitest 5 + Testing Library (jsdom) |
| Lint | ESLint v10 flat config (typescript-eslint, react-hooks, react-refresh) |
| Deploy | Cloudflare Pages / Workers via Wrangler 4 |

`tsconfig.app.json` enforces strict mode, `noUnusedLocals`, `noUnusedParameters`, an `ES2023` target, and `bundler` module resolution.

## Application shell

`src/main.tsx` mounts `src/App.tsx`, which wires the provider stack (outermost first):

```
QueryClientProvider        TanStack Query (queries retry once)
└─ GoogleOAuthProvider     requires VITE_GOOGLE_CLIENT_ID
   └─ AuthProvider         src/context/AuthContext.tsx
      └─ ErrorBoundary     page-level
         └─ ToastProvider  src/context/ToastContext.tsx
            └─ RouterProvider  React Router 8 data router (createBrowserRouter), Suspense-wrapped routes
```

If `VITE_GOOGLE_CLIENT_ID` is missing or still the placeholder value, `App` renders an explicit "Missing Google Client ID" screen instead of crashing.

## Routing

`src/App.tsx` builds a data router (`createBrowserRouter` + `createRoutesFromElements`) once per mount, so pages can use `useBlocker` (the goal calculator holds navigation while it has unsaved changes). A root layout route wraps every route in one `Suspense` boundary.

```
/login                             LoginPage
/dashboard                         ProtectedRoute → LandingPage (shell)
  index                            → redirects to visualization
  visualization                    Visualization (overview)
  visualization/heatmap            HeatmapPage
  portfolios                       PortfoliosPage
  portfolios/:id                   PortfolioDetailPage
  dca                              DCASimulation
  goals                            GoalsPage (saved goals)
  goals/new                        GoalCalculatorPage (new goal)
  goals/:id                        GoalCalculatorPage (saved goal)
  watchlist                        WatchlistPage
/                                  → redirects to /dashboard
*                                  NotFoundPage
```

`LandingPage` is the dashboard shell rendered on every authenticated route, so it is imported eagerly. Every other route component is lazy-loaded.

## Data layer

- **API layer** — `src/api/*` is a thin REST client per resource (portfolios, goals, stocks, watchlist, dividends, sentiment, simulations, users, …), based at `${VITE_API_URL}/api/v1`.
- **External FX source** — `src/api/fx.ts` is the one call that does not go to the backend: today's exchange rate from Frankfurter (ECB reference rates, free and keyless), based at `VITE_FX_API_URL` (default `https://api.frankfurter.dev/v1`; the host is in the CSP `connect-src` in `public/_headers`). `useFxRate(from, to)` (`['fx', from, to]`) fetches it once a day per browser: the rate is kept in `localStorage` (`stackvest:fx:<from>:<to>`) for the calendar day and in the query cache for 24 hours; the same currency is rate 1 with no request. Used by goal progress (see [Goal simulation](./features/goal-simulation.md#currency-conversion)).
- **Feature hooks** — `src/hooks/*` wrap the API layer with TanStack Query (`usePortfolio`, `usePortfolios`, `useWatchlistQuotes`, `useFearGreedIndex`, …). Components consume hooks, not the API layer directly. Data that spans every portfolio (`useAllPositions`, `useRecentActivity`) comes from cross-portfolio endpoints in one request each rather than one request per portfolio, because the backend rate-limits bursts per user (see [Overview dashboard](./features/overview-dashboard.md)). The transaction ledger has its own module and hooks: `src/api/transactions.ts` (list / create / update / delete) behind `useHoldingTransactions` (`['portfolio', id, 'transactions', 'holding', symbol]`), `usePortfolioTransactions` (`['portfolio', id, 'transactions', 'list', symbol, size]`), `useClosedPositions` (`['portfolio', id, 'positions', 'closed']`) and `useTransactionMutations`, whose create / update / delete invalidate `['portfolio', id]`, `['portfolio', id, 'positions']` and `['portfolios']` so every ledger change refreshes holdings, P&L, history and activity everywhere (see [Portfolio detail](./features/portfolio-detail.md)). Saved goals have their own module and hooks: `src/api/goals.ts` (`GET/POST /goals`, `GET/PUT/DELETE /goals/:id`) behind `useGoals` (`['goals']`), `useGoal` (`['goal', id]`) and `useGoalMutations`, which write results into both keys and refetch the list; deleting a portfolio also invalidates `['goals']` and `['goal']` because the backend clears goal links to it (see [Goal simulation](./features/goal-simulation.md#saved-goals)). Exception: `usePortfolioAnalysis` manages an SSE stream with its own state rather than a cached query (see [AI Strategy Analysis](./features/ai-strategy-analysis.md)).

## Authentication

Google OAuth / One Tap yields a JWT that is:

1. used as the bearer token for API calls,
2. cached in `localStorage`,
3. silently renewed before expiry, and
4. reconciled against the backend via `getMe` / `createMe`.

All of this lives in `src/context/AuthContext.tsx`. `ProtectedRoute` gates the `/dashboard` tree.

## Performance: code-splitting

- **Route-level** — heavy dependencies (Recharts) load only on routes that use them.
- **Vendor chunks** — `vite.config.ts` splits vendors with prioritised Rolldown `codeSplitting` groups: `react-vendor` (40), `router` (30), `query` (20), `charts` (10), keeping the critical path small.

## Resilience

- Page-level `ErrorBoundary`
- `ProtectedRoute` auth gate
- Toast system (`ToastContext`) for user feedback
- Client-side limits (below) so the UI can disable actions before a request is made

### Client-side limits

`src/config.ts` mirrors server-enforced caps so the UI can disable actions and show "NN / MAX" counters. The server remains the source of truth (e.g. `POST /portfolios` returns `409` when the cap is hit).

| Constant | Env var | Default |
|---|---|---|
| `MAX_PORTFOLIOS` | `VITE_MAX_PORTFOLIOS` | `10` |
| `MAX_ASSETS_PER_PORTFOLIO` | `VITE_MAX_ASSETS_PER_PORTFOLIO` | `20` |
| — (heatmap compare) | `VITE_MAX_COMPARE_ASSETS` | `5` |

`VITE_FX_API_URL` (default `https://api.frankfurter.dev/v1`) is the base URL of the FX source above; it is not a limit.

## Project structure

```
src/
  api/         # Thin REST client per resource
  hooks/       # TanStack Query feature hooks
  components/  # Feature components + charts, modals, and cards
    ui/        # Reusable primitives (Button, Card, Modal, Input, …)
  pages/       # Route-level pages (LandingPage shell, Portfolios, Heatmap, …)
  context/     # AuthContext, ToastContext
  domain/      # Pure business logic, grouped by domain (no React, no fetching)
    goal/      # Goal maths, inputs, results, chart points, Monte Carlo, progress, saved goals, suggested return
    dca/       # DCA inputs, lump-sum comparison, asset comparison, chart text alternative
    portfolio/ # Holdings merge and allocation, stats, P&L totals, percent-change series
    market/    # Holdings-today status, Fear & Greed bands, heatmap intensity, base-100 normalisation
    dividends/ # Calendar date helpers
  utils/       # Domain-neutral helpers: number/date formatting (`format`), chart time axis (`timeAxis`)
  lib/         # `cn` class-name helper for the UI primitives
  config.ts    # Client-side feature limits
```

Code in `src/domain/` must not import from `components/`, `hooks/` or `pages/`; it may import types from `src/api/` and helpers from `src/utils/`. Each domain file keeps its tests next to it (`math.ts` + `math.test.ts`). A helper used by only one domain belongs in that domain; put it in `utils/` only if it has no domain meaning.

## Architectural constraints

- **React Compiler is intentionally disabled** — do not enable it without discussion.
- **Styles live in co-located `.css` files** — never inject CSS via a JS string / `<style>` tag. See [AGENTS.md → CSS Conventions](../AGENTS.md#css-conventions).
