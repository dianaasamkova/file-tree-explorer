# 0004. Deferred search instead of a debounce

- **Status:** Accepted
- **Date:** 2026-11

## Context

Search filters the whole drive on every keystroke. A debounce is the common answer to "don't search on every keystroke".

## Options

1. **Debounce** (for example 150–300 ms): fewer searches, but every user waits a fixed time, even when a search takes 5 ms.
2. **`useDeferredValue`:** the input updates at full priority; the filtered tree renders at low priority, and React drops renders that are already outdated.

## Decision

Option 2 for search in the browser. Measured: a search over 10,000 names takes 4–6 ms. Two debounces remain where they pay off: the screen reader's match count is announced once typing pauses for 500 ms (one announcement, not one per letter), and the planned server search (0009) is debounced and cancellable, because each search becomes a request.

## Consequences

- No fixed delay; fast devices show results instantly, slow ones skip outdated renders.
- A search that is slow on its own still blocks: at 100,000 names a search takes about 57 ms. That is fixed by a search index or a worker (0009), not by a debounce.
