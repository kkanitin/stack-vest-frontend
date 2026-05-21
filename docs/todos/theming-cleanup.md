# Theming & CSS Cleanup — TODO Breakdown

Not user-facing. Two TODOs in `src/index.css` — one trivial deletion and one
blocked on a design asset.

## Tasks

### T-1. Drop deprecated `--accent*` aliases
- **Marker**: `src/index.css:39`
- **Tag**: `cleanup`
- **Current behaviour**: Lines 38–44 keep five deprecated CSS variables
  aliased to their `--primary*` / `--surface-*` replacements:
  - `--accent` → `--primary`
  - `--accent-bg` → `--primary-bg`
  - `--accent-border` → `--primary-border`
  - `--social-bg` → `--surface-high`
  - `--code-bg` → `--surface-high`
- **Verified at planning time**: grep across `src/` found no consumers of any
  of those names outside `index.css` itself.
- **Target behaviour**: Aliases deleted; comment block at lines 38–39
  removed.
- **Subtasks**
  1. Re-grep before touching: `--accent`, `--accent-bg`, `--accent-border`,
     `--social-bg`, `--code-bg` — verify zero hits outside `src/index.css`.
  2. Delete lines 38–44.
  3. Run `npm run build`; if any CSS module fails to resolve a variable,
     restore the relevant alias and add a TODO pointing at the lingering
     consumer (don't keep the whole block).

### T-2. Tune the light palette
- **Marker**: `src/index.css:86`
- **Tag**: `design`
- **Current behaviour**: Light theme block (line 87 onward) derives values
  from the dark palette by inversion, which approximates correctly but is not
  authoritative.
- **Blocker**: No light mockup exists in `design-asset/`.
- **Subtasks**
  1. Wait for a light theme mockup to land in `design-asset/`.
  2. When it does: review the spec, replace the derived colour values, then
     remove the TODO comment.
  3. Visually QA the light theme in OS-level `prefers-color-scheme: light` —
     all surfaces, badges, charts, segmented control, and the sidebar
     (which intentionally stays dark today) need a deliberate decision.
- **Action now**: none. Leave the TODO until design unblocks.

## Verification
- After T-1: `npm run build` succeeds; `grep -r "--accent" src/` returns zero
  hits.
- After T-2: with OS in light mode, every page in the app must match the
  provided mockup; no `--accent*` fallbacks should reappear.

## File touchpoints
- `src/index.css`
