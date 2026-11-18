# 0002. An own accessible tree instead of a tree library

- **Status:** Accepted
- **Date:** 2026-11

## Context

The 2024 version used MUI X Tree View. The rebuild needs a WAI-ARIA tree that is virtualized (10,000 items and more), has drag and drop with business rules, cut and paste, typeahead, and full control over focus. MUI and Emotion were also most of the old bundle.

## Options

1. **A tree library** (MUI X, react-arborist, react-complex-tree). Fast start, but each covers only part of the list: virtualization, ARIA, drag and drop with custom rules and our keyboard model rarely come together, and fighting a library's model costs more than owning it.
2. **An own tree on a flat, virtualized row model.** About 400 lines split into view, row, keyboard model and drag and drop.

## Decision

Option 2. The tree is flattened into rows (`getVisibleRows`), rendered with TanStack Virtual, and implements the WAI-ARIA tree pattern itself.

## Consequences

- Full control over accessibility and behaviour; the UI library share of the bundle fell from about 45 KB to 22 KB gzipped.
- More code to own and test: the tree has its own keyboard, drag-and-drop and virtualization tests, plus Playwright and axe checks.
- Revisit if the product needs features a mature library already has, such as multi-column tree grids.
