# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server with HMR
npm run build     # Type-check then bundle for production (tsc -b && vite build)
npm run lint      # Run ESLint
npm test          # Run the Vitest suite (watch mode; `npx vitest run` for one pass)
npm run preview   # Serve the production build locally
npm run deploy    # Deploy the dist folder to Cloudflare Pages
```

Tests run under Vitest + Testing Library — see `vitest.config.ts` (jsdom environment, setup in `src/test/setup.ts`).

## Deployment

This project is deployed to **Cloudflare Pages**.

### Manual Deployment
To deploy manually from your local machine:
1. Ensure you have the necessary environment variables set in the Cloudflare Dashboard.
2. Run:
   ```bash
   npm run build
   npm run deploy
   ```
   *Note: You may need to authenticate with Cloudflare (`npx wrangler login`) if it's your first time.*

### Automated Deployment (Recommended)
Connect this repository to Cloudflare Pages for automatic deployments on push:
- **Build Command**: `npm run build`
- **Build Output Directory**: `dist`
- **Root Directory**: `/` (or `frontend/` if in a monorepo)

*Note: With `wrangler.toml` present, Cloudflare Pages can also use `wrangler deploy` to perform the deployment, but standard Git integration is preferred. If updating to Wrangler v4+, ensure your build environment uses Node.js v22.12 or higher (also required by Vite 8 and Vitest 5).*

## Stack

- **React 19** + **TypeScript 6.0** + **Vite 8** (Rolldown bundler, Oxc transforms via `@vitejs/plugin-react`)
- ESLint v10 flat config (`eslint.config.js`) — typescript-eslint, react-hooks, react-refresh plugins
- `tsconfig.app.json` enforces `noUnusedLocals`, `noUnusedParameters`, strict mode, `ES2023` target, `bundler` module resolution

## Architecture

See the [docs index](./docs/index.md):
- [`docs/architecture.md`](./docs/architecture.md) — provider stack, routing, data layer (`src/api/*` → `src/hooks/*`), auth flow, code-splitting, client-side limits.
- [`docs/features/`](./docs/features/index.md) — one page per user-facing feature: route, entry point, components, hooks, and API calls.

### Read the Docs First (Mandatory)

**Before implementing or changing a feature, start at [`docs/index.md`](./docs/index.md).** Read the relevant page in `docs/features/` and `docs/architecture.md` to find the route, entry point, components, hooks, and API calls involved, then confirm against the source — the code is the source of truth if the two disagree (and fix the docs as part of your change).

### Documentation Maintenance (Mandatory)

**Every change MUST keep the `docs/` directory in sync with the code.** Treat docs updates as part of the change, not a follow-up. Before finishing any task, check whether it affects documented behavior and update the docs in the same change:

- **New feature** → add `docs/features/<feature-name>.md` and a row in `docs/features/index.md`.
- **Changed feature** (route, entry point, components, hooks, API calls, limits, behavior) → update that feature's page.
- **Removed feature** → delete its page and remove it from `docs/features/index.md`.
- **Architectural change** (provider stack, routing, data layer, auth flow, code-splitting, client-side limits, project structure, stack/dependency versions) → update `docs/architecture.md`.
- **New or renamed doc** → link it from `docs/index.md`.

Docs must describe the code as it is — verify names and paths against the source, and never leave a link pointing to a moved or deleted file.

When adding features, keep in mind the React Compiler is intentionally disabled (noted in the project README) — do not enable it without discussion.

## CSS Conventions

**Always use separate `.css` files — never inject styles via a JS string.**

The pattern below is explicitly forbidden:

```tsx
// ❌ Anti-pattern — do not do this
const S = `.my-class { color: red; }`;
return <><style>{S}</style>...</>;
```

**Why it's harmful:**
- Styles are re-injected into the DOM on every render, bypassing Vite's CSS pipeline (no deduplication, no minification, no caching).
- The JS bundle carries dead CSS weight that the browser cannot separately cache.
- It is invisible to linters and browser DevTools source maps.

**Correct pattern:** co-locate a `ComponentName.css` file next to the component and import it:

```tsx
// ✅ Correct
import './MyComponent.css';
```

## Environment Variables

- `.env`: Default configuration. Must be kept in sync with `.env.local` and contain all required keys with example/non-sensitive values.
- `.env.local`: Local overrides, ignored by Git. Contains sensitive data or local-only configuration.
- Always prefix client-side variables with `VITE_`.
- **Security**: Never commit sensitive data (secrets, API keys) to `.env`.

## Git Policy

AI Agents (including Junie) are strictly prohibited from performing operations that modify the remote repository or create local commits. This policy ensures that all changes are reviewed and committed by a human developer.

- **Forbidden Commands**: `git commit`, `git push`, `git merge`, `git rebase`.
- **Allowed Commands (Read-only)**: `git status`, `git fetch`, `git diff`, `git log`, `git show`, `git pull` (only for updating local state).
- **Mandatory Requirement**: Never initiate a commit or push under any circumstances.
