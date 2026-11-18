# 0009. Lazy folders, server search and a bucketed store at 1M items

- **Status:** Proposed (phases P2 and P3 of the v2 spec)
- **Date:** 2026-11

## Context

Measured on the model: at 1,000,000 items the response is 133 MB, normalizing it takes 4.2 s, a search 1.3 s, and one optimistic move 1.3 s, because `moveNode` copies the whole `nodes` object to stay immutable.

## Options

1. **Keep loading everything, optimise the hot paths.** Doesn't fix a 133 MB response.
2. **Lazy folders and server search.** Folders load page by page as they are opened and scrolled; search runs on the server (a Web Worker in the demo), debounced and cancellable.
3. **For moves:** a mutable store with a version counter (fast, but loses cheap snapshots), or a bucketed immutable store (nodes split into 256 buckets by id, so a move copies only the buckets it touches).

## Decision

Proposed: option 2 for loading and search, and the bucketed store for moves. See `docs/specs/v2-scale-and-performance.md`, sections 4.2 and 4.4.

## Consequences

- The row model must know about unloaded ranges (skeleton rows, a "load more" sentinel), which makes moves, counts and focus harder; it gets its own unit tests.
- Budgets checked in CI (no long tasks over 50 ms with the CPU slowed 6×) prove the result.
