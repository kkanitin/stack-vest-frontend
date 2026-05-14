# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server with HMR
npm run build     # Type-check then bundle for production (tsc -b && vite build)
npm run lint      # Run ESLint
npm run preview   # Serve the production build locally
npm run deploy    # Deploy the dist folder to Cloudflare Pages
```

No test runner is configured yet.

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

*Note: With `wrangler.toml` present, Cloudflare Pages can also use `wrangler deploy` to perform the deployment, but standard Git integration is preferred. If updating to Wrangler v4+, ensure your build environment uses Node.js v22 or higher.*

## Stack

- **React 19** + **TypeScript 5.6** + **Vite 6** (with Oxc transformer via `@vitejs/plugin-react-oxc`)
- ESLint v9 flat config (`eslint.config.js`) — typescript-eslint, react-hooks, react-refresh plugins
- `tsconfig.app.json` enforces `noUnusedLocals`, `noUnusedParameters`, strict mode, `ES2023` target, `bundler` module resolution

## Architecture

This is a greenfield SPA. The only source files so far are `src/main.tsx` (React root) and `src/App.tsx` (placeholder counter). No routing, state management, or API layer has been chosen yet — these decisions are pending.

When adding features, keep in mind the React Compiler is intentionally disabled (noted in the project README) — do not enable it without discussion.

👉 **[StackVest UI Skill](./skills/stackvest-ui/SKILL.md)**

All agents MUST refer to this skill when performing UI/Design tasks. It includes:
- **Core Principles**: Clarity, Precision, and Technical Aesthetic.
- **Design Tokens**: Typography (Inter/Mono split), theme-aware colors, and shape rules.
- **UI Patterns**: Layout conventions and interaction rules.
- **Review Checklist**: A mandatory checklist to run before submitting UI changes.
- **Templates**: Boilerplate for components like `FinancialCard`.

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
