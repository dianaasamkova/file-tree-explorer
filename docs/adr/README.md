# Architecture decision records

One page per decision that shaped the code: the context, the options considered, what was decided, and what it costs. A decision that changes gets a new record that supersedes the old one, so the reasoning stays readable over time.

| #                                                | Decision                                                     | Status   |
| ------------------------------------------------ | ------------------------------------------------------------ | -------- |
| [0001](0001-no-global-store.md)                  | No global store: TanStack Query, a reducer and the URL       | Accepted |
| [0002](0002-own-tree-component.md)               | An own accessible tree instead of a tree library             | Accepted |
| [0003](0003-active-descendant-virtualization.md) | `aria-activedescendant` with a virtualized flat list         | Accepted |
| [0004](0004-deferred-search.md)                  | Deferred search instead of a debounce                        | Accepted |
| [0005](0005-optimistic-moves.md)                 | Optimistic moves with rollback and undo                      | Accepted |
| [0006](0006-validate-at-the-boundary.md)         | Validate server data at the boundary                         | Accepted |
| [0007](0007-monorepo.md)                         | A monorepo with a design system, a feature and an app        | Accepted |
| [0008](0008-tests-beyond-coverage.md)            | Property-based and mutation testing for the data logic       | Accepted |
| [0009](0009-scaling-to-a-million-items.md)       | Lazy folders, server search and a bucketed store at 1M items | Proposed |

Template: [template.md](template.md).
