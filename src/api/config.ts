/**
 * Single source of truth for the backend base URL. Previously each of the nine
 * `src/api/*` modules rebuilt this string itself, which meant an unset
 * `VITE_API_URL` silently produced the literal `"undefined/api/v1"` — a
 * *relative* URL. Requests carrying an `Authorization: Bearer` header would
 * then go to the SPA's own origin instead of failing loudly.
 *
 * The fallback below is deliberately same-origin `/api/v1`, which is what
 * `vite.config.ts` already proxies to the backend in dev. The guard warns
 * rather than throwing: a module-scope throw would take down the whole test
 * suite, since `src/test/setup.ts` stubs no environment variables.
 */
function resolveApiBase(): string {
  const url = import.meta.env.VITE_API_URL;
  if (!url) {
    console.error(
      '[StackVest] VITE_API_URL is not set — falling back to the same-origin /api/v1. ' +
        'Set it in .env.local for local development, or in the Cloudflare dashboard for deployments.'
    );
    return '/api/v1';
  }
  // Trailing slashes would produce `//api/v1`, which some routers 404 on.
  return `${url.replace(/\/+$/, '')}/api/v1`;
}

export const API_BASE = resolveApiBase();
