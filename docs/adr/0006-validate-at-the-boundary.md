# 0006. Validate server data at the boundary

- **Status:** Accepted
- **Date:** 2026-11

## Context

TypeScript types describe what the server should send, not what it does send. A malformed response would crash deep inside a component, far from the cause.

## Options

1. **Trust the types.** No cost, but bad data fails late and confusingly.
2. **Validate every response with a schema before it reaches the cache.**

## Decision

Option 2. The contract returns `unknown` for the drive; `parseTreeResponse` checks it with a zod schema (`api/schema.ts`), kept in step with the TypeScript types by `satisfies`. Bad data becomes one `ApiError` (502) naming the first problem's path, shown by the existing error state.

## Consequences

- Validating the 10,000-item drive takes about 10 ms, about as long as normalizing it.
- It adds 8.5 KB gzipped to the bundle with `zod/mini`, the tree-shakable build. The full `zod` build added 26 KB, which was measured and rejected.
- The demo shows it with `?corrupt`, which makes the mock server send a malformed drive.
