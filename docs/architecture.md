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
            └─ Router      React Router 8, Suspense-wrapped routes
```

If `VITE_GOOGLE_CLIENT_ID` is missing or still the placeholder value, `App` renders an explicit "Missing Google Client ID" screen instead of crashing.

## Routing

```
/login                             LoginPage
/dashboard                         ProtectedRoute → LandingPage (shell)
  index                            → redirects to visualization
  visualization                    Visualization (overview)
  visualization/heatmap            HeatmapPage
  portfolios                       PortfoliosPage
  portfolios/:id                   PortfolioDetailPage
  dca                              DCASimulation
  watchlist                        WatchlistPage
/                                  → redirects to /dashboard
*                                  NotFoundPage
```

`LandingPage` is the dashboard shell rendered on every authenticated route, so it is imported eagerly. Every other route component is lazy-loaded.

## Data layer

- **API layer** — `src/api/*` is a thin REST client per resource (portfolios, stocks, watchlist, dividends, sentiment, simulations, users, …), based at `${VITE_API_URL}/api/v1`.
- **Feature hooks** — `src/hooks/*` wrap the API layer with TanStack Query (`usePortfolio`, `usePortfolios`, `useWatchlistQuotes`, `useFearGreedIndex`, …). Components consume hooks, not the API layer directly. Exception: `usePortfolioAnalysis` manages an SSE stream with its own state rather than a cached query (see [AI Strategy Analysis](./features/ai-strategy-analysis.md)).

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

## Project structure

```
src/
  api/         # Thin REST client per resource
  hooks/       # TanStack Query feature hooks
  components/  # Feature components + charts, modals, and cards
    ui/        # Reusable primitives (Button, Card, Modal, Input, …)
  pages/       # Route-level pages (LandingPage shell, Portfolios, Heatmap, …)
  context/     # AuthContext, ToastContext
  utils/       # Formatting, scoring, and chart helpers
  config.ts    # Client-side feature limits
```

## Architectural constraints

- **React Compiler is intentionally disabled** — do not enable it without discussion.
- **Styles live in co-located `.css` files** — never inject CSS via a JS string / `<style>` tag. See [AGENTS.md → CSS Conventions](../AGENTS.md#css-conventions).
- **UI work follows the [StackVest UI Skill](../skills/stackvest-ui/SKILL.md)** (design tokens, patterns, review checklist).
