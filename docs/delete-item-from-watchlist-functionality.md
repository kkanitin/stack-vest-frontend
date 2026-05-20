# Delete Item from Watchlist Functionality

> **Status:** Implemented  
> **Created:** 2026-05-18  
> **Author:** kanitin.kr

## Overview

Add the ability for users to remove an item from their watchlist directly from `WatchlistPage`. The backend API endpoint (`DELETE /api/v1/watchlist/:symbol`) is already available. This plan covers adding the `deleteFromWatchlist` API function, wiring up delete state in the page component, rendering a per-row delete button with loading/error feedback, and migrating the page's inline CSS string to a co-located `WatchlistPage.css` file to comply with project CSS conventions.

## Goals

- Add `deleteFromWatchlist(token, symbol)` to `src/api/watchlist.ts`.
- Render a delete button on each row in the "Your Watchlist" list.
- Show per-row loading state while deletion is in flight.
- Show per-row inline error message if deletion fails.
- On success, remove the item from local `watchlist` state and its symbol from the `added` Set — no full refetch needed.
- Extract all inline styles from `WatchlistPage.tsx` into `src/pages/WatchlistPage.css` and import that file instead.

## Non-Goals

- Changes to any other page or component.
- Undo / restore deleted items.
- Bulk-delete or select-all flows.
- Backend changes (API is already ready).
- Adding a confirmation dialog (can be a follow-up).

## Approach

### API layer (`src/api/watchlist.ts`)

Add a single exported function:

```ts
export async function deleteFromWatchlist(token: string, symbol: string): Promise<void> {
  const res = await fetch(`${API_BASE}/watchlist/${symbol}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.errorMessage || 'Failed to remove from watchlist');
  }
}
```

This mirrors the error-handling pattern of `addToWatchlist`.

### State (`WatchlistPage.tsx`)

Introduce two new state variables — mirroring the existing `adding` / `addErrors` pattern:

```ts
const [deleting, setDeleting] = useState<string | null>(null); // symbol being deleted
const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({}); // symbol → error
```

Add a `handleDelete` handler:

```ts
const handleDelete = async (item: WatchlistItem) => {
  if (!token || deleting) return;
  setDeleting(item.symbol);
  setDeleteErrors(prev => { const n = { ...prev }; delete n[item.symbol]; return n; });
  try {
    await deleteFromWatchlist(token, item.symbol);
    setWatchlist(prev => prev.filter(w => w.symbol !== item.symbol));
    setAdded(prev => { const n = new Set(prev); n.delete(item.symbol); return n; });
  } catch (err) {
    setDeleteErrors(prev => ({
      ...prev,
      [item.symbol]: err instanceof Error ? err.message : 'Failed to remove',
    }));
  } finally {
    setDeleting(null);
  }
};
```

### UI (`WatchlistPage.tsx`)

Add a delete button to each `.wl-list-row`:

```tsx
<button
  className="wl-remove"
  onClick={() => handleDelete(item)}
  disabled={deleting !== null}
>
  {deleting === item.symbol ? 'Removing…' : 'Remove'}
</button>
{deleteErrors[item.symbol] && (
  <span className="wl-list-err">{deleteErrors[item.symbol]}</span>
)}
```

### CSS (`src/pages/WatchlistPage.css`)

Move all rules from the inline `S` string into a new `WatchlistPage.css` file and add:

```css
.wl-remove {
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 600;
  font-family: var(--sans);
  letter-spacing: 0.03em;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-h);
  border-radius: 8px;
  cursor: pointer;
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  flex-shrink: 0;
}
.wl-remove:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
  transform: translateY(-1px);
  box-shadow: var(--shadow);
}
.wl-remove:disabled {
  opacity: 0.55;
  cursor: default;
}
.wl-list-err {
  font-size: 11px;
  color: var(--accent);
}
```

Replace `<style>{S}</style>` in the JSX with `import './WatchlistPage.css'` at the top of the file, and delete the `const S = \`...\`` block.

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Add `deleteFromWatchlist` to `src/api/watchlist.ts` | kanitin.kr | [x] |
| 2 | Extract inline CSS `S` string to `src/pages/WatchlistPage.css` | kanitin.kr | [x] |
| 3 | Add `.wl-remove` and `.wl-list-err` rules to `WatchlistPage.css` | kanitin.kr | [x] |
| 4 | Add `deleting` and `deleteErrors` state + `handleDelete` to `WatchlistPage` | kanitin.kr | [x] |
| 5 | Render delete button and error message in each `.wl-list-row` | kanitin.kr | [x] |
| 6 | Manual smoke-test: add item, delete it, verify list updates and re-add is possible | TBD | [ ] |

## Dependencies

- `DELETE /api/v1/watchlist/:symbol` endpoint is live and accepts a Bearer token. ✅
- No new packages required.

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| API endpoint path differs from assumed `/watchlist/:symbol` | Low | Low | Confirmed by user — delete by symbol ✅ |
| CSS extraction breaks existing styles (selector conflicts, ordering) | Low | Low | Extract 1:1 — no selector changes, just move to file |
| Race condition: user triggers delete twice before state updates | Low | Low | `disabled={deleting !== null}` prevents concurrent deletes |

## Open Questions

- [x] DELETE endpoint path is `/api/v1/watchlist/:symbol` — confirmed.
- [x] Should a confirmation dialog (e.g. "Are you sure?") be shown before deletion? (deferred)
- [ ] Should successful deletion also refresh live quote data shown elsewhere (e.g. `useWatchlistQuotes`)?

## References

- `src/api/watchlist.ts` — existing API layer
- `src/pages/WatchlistPage.tsx` — page to be modified
- `AGENTS.md` — CSS conventions (no inline style strings)
