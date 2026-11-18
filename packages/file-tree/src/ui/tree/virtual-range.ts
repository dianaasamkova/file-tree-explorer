import { defaultRangeExtractor, type Range } from '@tanstack/react-virtual'

/**
 * The rows the virtualizer renders: the visible range plus a few rows that must stay in the DOM
 * wherever the user scrolls, such as the focused row (`aria-activedescendant` must point to a real
 * element) and the row being dragged (if it unmounts, its `dragend` never arrives).
 */
export function withPinnedIndexes(range: Range, pinned: readonly (number | undefined)[]): number[] {
  const indexes = new Set(defaultRangeExtractor(range))
  for (const index of pinned) {
    if (index !== undefined && index >= 0 && index < range.count) indexes.add(index)
  }
  return [...indexes].sort((a, b) => a - b)
}
