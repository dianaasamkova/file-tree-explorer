import type { MoveError } from '../model/move'

/** How the user moved an item. Every way of moving is measured, so their use can be compared. */
export type MoveMethod = 'drag' | 'keyboard' | 'picker' | 'undo'

/**
 * The product events of the explorer: each one answers a question in the "Product" section of
 * TECH.md. Typed, so a tracking call can't misspell an event or forget a field.
 */
export type ProductEvent =
  /** A search the user stopped typing in: how often searches find nothing. */
  | { name: 'search_settled'; queryLength: number; matches: number }
  /** A move the server accepted: which ways of moving people use. */
  | { name: 'item_moved'; method: MoveMethod }
  /** A move the UI refused before sending it, such as pasting into the item's own subfolder. */
  | { name: 'move_refused'; method: MoveMethod; reason: MoveError }
  /** A move the server refused: rollbacks the user saw. */
  | { name: 'move_failed'; method: MoveMethod; status: number | null }

export type Tracker = (event: ProductEvent) => void

/** By default events are logged in development and dropped elsewhere; no data leaves the page. */
const defaultTracker: Tracker = (event) => {
  if (import.meta.env.MODE === 'development') console.debug('[track]', event)
}

let tracker = defaultTracker

export function track(event: ProductEvent): void {
  tracker(event)
}

/**
 * Sends events somewhere else: an analytics service in a real product, a spy in tests.
 * Returns a function that restores the previous tracker.
 */
export function setTracker(next: Tracker): () => void {
  const previous = tracker
  tracker = next
  return () => {
    tracker = previous
  }
}
