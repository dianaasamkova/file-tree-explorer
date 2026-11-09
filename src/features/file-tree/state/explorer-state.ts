import { useReducer } from 'react'
import type { NodeId } from '../model/types'
import type { SearchResult } from '../model/visible'

/**
 * UI state of the explorer. Server data lives in TanStack Query; shareable bits (query, selected
 * file, dataset) are mirrored to the URL. Nothing here needs to be global, so a reducer is enough.
 *
 * Expansion is kept twice on purpose: `expandedIds` is what the user opened while browsing, and
 * `search` holds their tweaks on top of the search's auto-expansion. Clearing the search drops
 * the tweaks and brings back the folders they had open before.
 */
export interface ExplorerState {
  expandedIds: ReadonlySet<NodeId>
  search: { expandedIds: ReadonlySet<NodeId>; collapsedIds: ReadonlySet<NodeId> }
  selectedId: NodeId | null
  focusedId: NodeId | null
  /** An item marked with Ctrl+X, waiting for Ctrl+V. */
  cutId: NodeId | null
}

export type ExpansionMode = 'browse' | 'search'

export type ExplorerAction =
  | { type: 'expand'; ids: NodeId[]; mode: ExpansionMode }
  | { type: 'collapse'; id: NodeId; mode: ExpansionMode }
  /** Opens every ancestor so the item is on screen, then focuses and selects it. */
  | { type: 'reveal'; id: NodeId; ancestorIds: NodeId[] }
  | { type: 'focus'; id: NodeId }
  | { type: 'select'; id: NodeId | null }
  | { type: 'cut'; id: NodeId | null }
  | { type: 'searchChanged' }
  | { type: 'reset'; selectedId?: NodeId | null }

const emptySearch: ExplorerState['search'] = { expandedIds: new Set(), collapsedIds: new Set() }

export function createInitialState(selectedId: NodeId | null = null): ExplorerState {
  return { expandedIds: new Set(), search: emptySearch, selectedId, focusedId: selectedId, cutId: null }
}

const withAdded = (set: ReadonlySet<NodeId>, ids: NodeId[]) => new Set([...set, ...ids])
const without = (set: ReadonlySet<NodeId>, ids: NodeId[]) => {
  const next = new Set(set)
  for (const id of ids) next.delete(id)
  return next
}

export function explorerReducer(state: ExplorerState, action: ExplorerAction): ExplorerState {
  switch (action.type) {
    case 'expand':
      if (action.mode === 'browse') return { ...state, expandedIds: withAdded(state.expandedIds, action.ids) }
      return {
        ...state,
        search: {
          expandedIds: withAdded(state.search.expandedIds, action.ids),
          collapsedIds: without(state.search.collapsedIds, action.ids),
        },
      }
    case 'collapse':
      if (action.mode === 'browse') return { ...state, expandedIds: without(state.expandedIds, [action.id]) }
      return {
        ...state,
        search: {
          expandedIds: without(state.search.expandedIds, [action.id]),
          collapsedIds: withAdded(state.search.collapsedIds, [action.id]),
        },
      }
    case 'reveal':
      return {
        ...state,
        expandedIds: withAdded(state.expandedIds, action.ancestorIds),
        search: { ...state.search, collapsedIds: without(state.search.collapsedIds, action.ancestorIds) },
        selectedId: action.id,
        focusedId: action.id,
      }
    case 'focus':
      return state.focusedId === action.id ? state : { ...state, focusedId: action.id }
    case 'select':
      return { ...state, selectedId: action.id, focusedId: action.id ?? state.focusedId }
    case 'cut':
      return { ...state, cutId: action.id }
    case 'searchChanged':
      return state.search === emptySearch ? state : { ...state, search: emptySearch }
    case 'reset':
      return createInitialState(action.selectedId ?? null)
  }
}

/** Folders shown open right now: the user's own while browsing, or the search's plus tweaks. */
export function getExpandedIds(state: ExplorerState, search: SearchResult | null): ReadonlySet<NodeId> {
  if (!search) return state.expandedIds
  const expanded = new Set([...search.autoExpandedIds, ...state.search.expandedIds])
  for (const id of state.search.collapsedIds) expanded.delete(id)
  return expanded
}

export function useExplorerState(initialSelectedId: NodeId | null) {
  return useReducer(explorerReducer, initialSelectedId, createInitialState)
}
