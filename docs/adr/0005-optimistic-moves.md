# 0005. Optimistic moves with rollback and undo

- **Status:** Accepted
- **Date:** 2026-11

## Context

Moving a file should feel instant, but the server can refuse (the demo has a read-only folder the client doesn't know about), and several moves can be in flight at once.

## Options

1. **Wait for the server, then update.** Simple, but every move lags by the round trip.
2. **Optimistic update, roll back by restoring a snapshot.** Instant, but restoring a whole-tree snapshot also erases other moves still in flight.
3. **Optimistic update, revert only the failed move; refetch after the last pending move.**

## Decision

Option 3. The tree changes at once. A failed move undoes only itself on the current tree (or refetches when that is no longer possible), and the tree is refetched only after the last pending move settles, so a refetch can't overwrite a move the server hasn't applied yet. Every successful move can be undone from its toast.

## Consequences

- Instant feedback, honest rollbacks with the server's reason, and Undo for mistaken drops.
- Concurrency rules live in one hook (`useMoveMutation`) with tests for overlapping moves. Both concurrency bugs were found in code review and fixed with tests.
