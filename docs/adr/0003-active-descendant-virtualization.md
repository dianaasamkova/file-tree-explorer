# 0003. `aria-activedescendant` with a virtualized flat list

- **Status:** Accepted
- **Date:** 2026-11

## Context

With virtualization only about 30 rows exist in the DOM. The WAI-ARIA tree pattern allows two ways to manage focus: moving real focus between items (roving `tabindex`) or keeping focus on the tree and pointing at the active item with `aria-activedescendant`.

## Options

1. **Roving `tabindex`.** Focus moves to a row element, but the row may not exist yet when focus moves to it.
2. **`aria-activedescendant` on the container.** One tab stop; the container keeps focus.

## Decision

Option 2. Focus stays on the tree; arrow keys move `aria-activedescendant`. The focused row and the row being dragged are always kept in the DOM (`withPinnedIndexes`), so the attribute never points at a missing element and `dragend` always arrives.

## Consequences

- One tab stop and keyboard handling in one place (`use-tree-keyboard.ts`).
- The view scrolls the focused row into view when focus moves to another item, but not when rows shift around it, so it doesn't fight the user's own scrolling.
- Found and fixed in review: before pinning, scrolling the focused row away left `aria-activedescendant` pointing at nothing.
