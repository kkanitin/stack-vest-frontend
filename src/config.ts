// Client-side feature limits. These mirror the server-enforced caps so the UI can
// disable actions and show "NN / MAX" counters before a request is made. The server
// remains the source of truth (e.g. POST /portfolios returns 409 when the cap is hit).
export const MAX_PORTFOLIOS = Number(import.meta.env.VITE_MAX_PORTFOLIOS) || 10;
export const MAX_ASSETS_PER_PORTFOLIO = Number(import.meta.env.VITE_MAX_ASSETS_PER_PORTFOLIO) || 20;
