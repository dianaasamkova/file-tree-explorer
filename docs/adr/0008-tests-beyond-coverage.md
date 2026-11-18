# 0008. Property-based and mutation testing for the data logic

- **Status:** Accepted
- **Date:** 2026-11

## Context

Coverage is at 100%, but coverage only says that a line ran, not that a test would notice if it were wrong. The tree model (normalizing, moves, search) is where a bug corrupts data.

## Options

1. **More example-based tests.** Each covers one tree someone thought of.
2. **Property-based tests** (fast-check): random drives and random move sequences, checked against rules that must always hold.
3. **Mutation testing** (Stryker): small deliberate changes to the code; a test must fail for each.

## Decision

Options 2 and 3 for `model/` and `state/`. The properties check that nothing is lost or duplicated, parent links stay consistent, there are no cycles, children stay sorted, `canMove` predicts exactly which moves succeed, a move and its reverse give an equal tree, and search shows every match's folders. Stryker runs weekly in CI and fails below a 90% mutation score.

## Consequences

- Mutation score 97.8%. The first run found real gaps (now tested) and a defensive branch that could never run (removed). The 10 surviving mutants are equivalent: they can't change behaviour (for example a `break` that only saves time).
- Against a deliberately broken sorted insert, two properties fail and shrink the input to a three-node tree.
- Mutation testing takes about 6 minutes, so it doesn't run on every push.
