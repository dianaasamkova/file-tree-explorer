# 0001. No global store: TanStack Query, a reducer and the URL

- **Status:** Accepted
- **Date:** 2026-11

## Context

The explorer has three kinds of state: the drive from the server, the UI state of one screen (open folders, selection, keyboard focus, a cut item), and state worth sharing as a link (the search, the selected file, the drive). The reflex for a React app this size is a global store.

## Options

1. **Redux Toolkit or Zustand for everything.** One place for all state, devtools. But server state would need hand-written caching, loading and error flags, and optimistic updates; and screen state would be global without a second consumer.
2. **TanStack Query for server state, `useReducer` for the screen, the URL for links.** Each kind of state gets the tool built for it.

## Decision

Option 2. The drive lives in TanStack Query (caching per drive, loading and error states, cancellation, optimistic updates). The screen's state is one typed reducer in `state/`. The search, the selected file and the drive are mirrored to the query string with `replaceState`.

## Consequences

- No store boilerplate; every piece of state has one owner, and the reducer is tested as pure functions.
- If a second screen needs the selection, the reducer moves into a context; it's already one unit.
- Revisit if several distant parts of the app start sharing client-side state.
