# Add Asset Flow — TODO Breakdown

Modal triggered from the Watchlist "+ Add Asset" button
(`AddAssetModal.tsx`). One TODO.

## Tasks

### A-1. Replace static suggested-assets list
- **Marker**: `src/components/AddAssetModal.tsx:8`
- **Tag**: `mock`
- **Current behaviour**: `SUGGESTED` constant (lines 10–16) lists five
  hard-coded popular assets (BTC, ETH, AAPL, NVDA, SPY) shown whenever the
  search input is empty.
- **Target behaviour**: List is fetched from the backend so product can update
  the curated set without a frontend deploy.
- **Subtasks**
  1. Backend: `GET /suggestions` (or share `/popular` with the Heatmap empty
     state — see `heatmap.md` H-2) returning
     `[{ symbol, name, type }]`.
  2. Add `getSuggestions(token)` to `src/api/stocks.ts`.
  3. Replace the `SUGGESTED` constant with state populated on modal open;
     show a loading state in the suggested list while pending.
  4. Reset / refetch when the modal is reopened (the modal already resets
     query state in the `useEffect` at line 34 — extend that block).
  5. Handle fetch failure: keep showing the section label but render a small
     "Couldn't load suggestions" message; search still works.

## Coordination
- Coordinate with Heatmap H-2: if both consume the same `/popular` endpoint,
  one shared hook (`usePopularAssets`) prevents two fetches per session.

## Verification
- Open the Add Asset modal with the search box empty → "Suggested" rows must
  match what the backend returns.
- Block the network call → the modal stays usable, search results still
  appear when the user types.

## File touchpoints
- `src/components/AddAssetModal.tsx`
- `src/api/stocks.ts`
