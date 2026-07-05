# StackVest — Frontend

A modern investment dashboard for tracking portfolios, watchlists, and market sentiment — and for backtesting strategies before you commit real money.

**🔗 [Live demo](https://stackvest.app/)** · [Main repository](https://github.com/kkanitin/StackVest)

> **Part of the StackVest monorepo.** This repository is the web frontend. For the backend API and the full-stack overview, see the [main repository](https://github.com/kkanitin/StackVest).

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://stackvest.app/)
![React 19](https://img.shields.io/badge/React-19-149eca)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6)
![Vite 6](https://img.shields.io/badge/Vite-6-646cff)
![Vitest](https://img.shields.io/badge/tested_with-Vitest-6da55f)
![Cloudflare Pages](https://img.shields.io/badge/deploy-Cloudflare_Pages-f38020)

---

## Overview

StackVest is a single-page application that helps retail investors track their holdings, watch the market, and reason about strategy. It talks to a separate REST API (part of the same monorepo) and authenticates users with Google. The UI is built around clear, data-dense financial cards and charts, with server state managed through TanStack Query so every view stays fresh without manual refetch plumbing.

## Features

- **Overview dashboard** — portfolio value, market status, and recent activity at a glance, plus a **Fear & Greed Index** gauge with a "what's driving this score" signal breakdown.
- **Portfolios ("strategies")** — create, edit, and delete multiple named portfolios (capped per account), each with a summary stats header and optimistic updates.
- **Portfolio detail** — holdings table, net value, 24h performance, allocation usage, and add/edit/remove of individual positions.
- **AI Strategy Analysis** — a streamed, markdown-rendered analysis of a portfolio, with scored dimensions (diversification, risk, fees).
- **Market heatmap** — four view modes (heatmap tiles, list with sparklines, performance bars, and a multi-asset compare chart), with period (1D/1W/1M/YTD) and sector filters; the compare selection is persisted in the URL.
- **DCA simulation** *(Beta)* — backtest dollar-cost averaging for an asset, amount, frequency, and date range, with ROI/KPIs and a growth chart.
- **Watchlist** — track assets with 7-day sparklines and toggle per-symbol price alerts.
- **Global asset search** — a topbar search that opens a detail modal with company profile stats and a price chart.
- **Dividend calendar** — projected payouts for your holdings, grouped by payment date, with an estimated monthly total.

## Tech stack

| Area | Choice |
|---|---|
| UI | React 19.2, TypeScript ~5.6 |
| Build | Vite 6 (Oxc transformer via `@vitejs/plugin-react-oxc`) |
| Routing | React Router 7 |
| Server state | TanStack Query 5 |
| Charts | Recharts 3 |
| Markdown | react-markdown |
| Auth | `@react-oauth/google` + `jwt-decode` (Google OAuth / One Tap) |
| Testing | Vitest 4 + Testing Library (jsdom) |
| Deploy | Cloudflare Pages / Workers via Wrangler 4 |

## Architecture highlights

- **Route-level code-splitting** — heavy dependencies (Recharts) load only on the routes that use them, and the build manually splits vendor chunks (`charts`, `router`, `query`, `react-vendor`) in `vite.config.ts` to keep the critical path small.
- **Auth flow** — Google OAuth / One Tap yields a JWT that's used as a bearer token, cached in `localStorage`, silently renewed before expiry, and reconciled against the backend via `getMe`/`createMe` (`src/context/AuthContext.tsx`).
- **Thin API layer** — `src/api/*` wraps the backend at `${VITE_API_URL}/api/v1`; data flows into feature hooks under `src/hooks/*` built on TanStack Query.
- **Resilience** — a page-level `ErrorBoundary`, a `ProtectedRoute` gate, a toast system, and client-side limits (`src/config.ts`) that mirror the server-enforced caps so the UI can disable actions before a request is made.

## Getting started

### Prerequisites

- **Node.js 22+** (Wrangler v4 requires it)
- A **Google OAuth client ID** ([Google Cloud Console](https://console.cloud.google.com/apis/credentials))
- A running instance of the StackVest **backend API** (see the [backend repository](https://github.com/kkanitin/stack-vest-backend))

### Install & run

```bash
npm install

# Create your local env file from the committed defaults, then edit it
cp .env .env.local

npm run dev
```

At minimum, set the following in `.env.local`:

- `VITE_GOOGLE_CLIENT_ID` — without it, the app renders an explicit "Missing Google Client ID" screen instead of crashing.
- `VITE_API_URL` — point it at your running backend (defaults to `http://localhost:8080`).

Then open the localhost URL Vite prints.

## Environment variables

All client-side variables must be prefixed with `VITE_`. Keep secrets in `.env.local` (git-ignored); `.env` holds non-sensitive defaults.

| Variable | Purpose | Default |
|---|---|---|
| `VITE_API_URL` | Backend API base URL (calls hit `${VITE_API_URL}/api/v1`) | `http://localhost:8080` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID | — (required) |
| `VITE_MAX_PORTFOLIOS` | Client-side cap on portfolios | `10` |
| `VITE_MAX_ASSETS_PER_PORTFOLIO` | Client-side cap on assets per portfolio | `20` |
| `VITE_MAX_COMPARE_ASSETS` | Max assets in the heatmap compare view | `5` |
| `VITE_APP_TITLE` | App title / branding | `StackVest` |
| `VITE_GREETINGS` | Semicolon-separated dashboard greeting phrases | — |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Type-check then bundle for production (`tsc -b && vite build`) |
| `npm run test` | Run the Vitest suite (watch mode; add `-- --run` for a single pass) |
| `npm run lint` | Run ESLint |
| `npm run preview` | Build, then serve locally via Wrangler |
| `npm run deploy` | Build, then deploy to Cloudflare |

## Testing

Tests use **Vitest** and **Testing Library** in a jsdom environment, colocated next to the code they cover (e.g. `src/pages/LoginPage.test.tsx`, `src/context/AuthContext.test.tsx`, `src/api/users.test.ts`).

```bash
npm run test -- --run
```

The suite currently runs **66 tests across 19 files**, all passing.

## Deployment

The app deploys to **Cloudflare Pages / Workers** via Wrangler (`wrangler.jsonc`, configured with single-page-application fallback routing).

```bash
npm run build
npm run deploy
```

Alternatively, connect the repo to Cloudflare Pages for automatic deploys on push (build command `npm run build`, output directory `dist`). See [`AGENTS.md`](./AGENTS.md) for the full deployment reference.

## Project structure

```
src/
  api/         # Thin REST client per resource (portfolios, stocks, watchlist, …)
  hooks/       # TanStack Query feature hooks (usePortfolio, useWatchlistQuotes, …)
  components/  # Feature components + charts, modals, and cards
    ui/        # Reusable primitives (Button, Card, Modal, Input, …)
  pages/       # Route-level pages (LandingPage shell, Portfolios, Heatmap, …)
  context/     # AuthContext, ToastContext
  utils/       # Formatting, scoring, and chart helpers
  config.ts    # Client-side feature limits
```

---

*Frontend package of the [StackVest monorepo](https://github.com/kkanitin/StackVest).*
