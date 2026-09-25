# AI Strategy Analysis

**Opened from:** [Portfolios](./portfolios.md) and [Portfolio detail](./portfolio-detail.md) (lazy-loaded modal)
**Entry point:** `src/components/AnalyzePortfolioModal.tsx`

A streamed, markdown-rendered analysis of a portfolio, with scored dimensions: **diversification**, **risk**, and **fees**.

## Components

| Component | Purpose |
|---|---|
| `AnalyzePortfolioModal` | Hosts the streamed analysis, rendered with react-markdown |
| `DimensionCard` | One card per scored dimension, with sentiment |

## Data

| Hook | API |
|---|---|
| `usePortfolioAnalysis` | `src/api/portfolios.ts` → `analyzePortfolio` (stream), `parsePortfolioAnalysis` |

Unlike the other feature hooks, `usePortfolioAnalysis` is **not** a TanStack Query hook — an SSE stream isn't a cacheable query. It manages its own status (`idle` → `streaming` → `done` / `error`). Dimensions default to `DEFAULT_ANALYSIS_DIMENSIONS`.

Tests: `src/api/portfolios.analyze.test.ts`, `src/api/portfolios.analysis.test.ts`, `AnalyzePortfolioModal.test.tsx`, `DimensionCard.test.tsx`.
