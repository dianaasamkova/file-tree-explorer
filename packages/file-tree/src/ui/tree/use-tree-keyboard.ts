import { useRef, type KeyboardEvent } from 'react'
import { getDropTarget } from '../../model/move'
import type { FolderTarget, NodeId, Tree } from '../../model/types'
import type { VisibleRow } from '../../model/visible'

const TYPEAHEAD_RESET = 600

export interface TreeKeyboardOptions {
  tree: Tree
  rows: VisibleRow[]
  focusedIndex: number
  indexById: ReadonlyMap<NodeId, number>
  cutId: NodeId | null
  /** How many rows fit in the viewport, for Page Up and Page Down. */
  getPageSize(): number
  onFocusItem(id: NodeId): void
  onSelect(id: NodeId): void
  onToggle(id: NodeId, expand: boolean): void
  onExpandMany(ids: NodeId[]): void
  onCut(id: NodeId | null): void
  onPaste(target: FolderTarget): void
}

/**
 * The WAI-ARIA tree keyboard model, plus cut and paste. Returns a handler that runs the action
 * for a key and reports whether the key was used, so the caller can stop the browser's default.
 */
export function useTreeKeyboard({
  tree,
  rows,
  focusedIndex,
  indexById,
  cutId,
  getPageSize,
  onFocusItem,
  onSelect,
  onToggle,
  onExpandMany,
  onCut,
  onPaste,
}: TreeKeyboardOptions) {
  const typeahead = useRef({ text: '', time: 0 })

  const focusRow = (index: number) => {
    onFocusItem(rows[Math.max(0, Math.min(rows.length - 1, index))]!.id)
  }

  /** A new search starts after the focused item; a longer prefix may keep the focused one. */
  const findByPrefix = (text: string) => {
    for (let step = text.length > 1 ? 0 : 1; step <= rows.length; step += 1) {
      const row = rows[(focusedIndex + step + rows.length) % rows.length]!
      if (row.node.name.toLocaleLowerCase().startsWith(text)) return row
    }
    return undefined
  }

  return (event: KeyboardEvent): boolean => {
    const row = rows[focusedIndex]!
    const key = event.key

    if (event.ctrlKey || event.metaKey) {
      if (key.toLowerCase() === 'x') {
        onCut(row.id)
        return true
      }
      if (key.toLowerCase() === 'v' && cutId !== null) {
        onPaste(getDropTarget(tree, row.id))
        return true
      }
      return false
    }
    if (event.altKey) return false

    const pageSize = getPageSize()
    const moves: Record<string, number> = {
      ArrowDown: focusedIndex + 1,
      ArrowUp: focusedIndex - 1,
      Home: 0,
      End: rows.length - 1,
      PageDown: focusedIndex + pageSize,
      PageUp: focusedIndex - pageSize,
    }
    if (key in moves) {
      focusRow(moves[key]!)
      return true
    }
    if (key === 'ArrowRight') {
      if (row.node.type === 'folder' && !row.isExpanded) onToggle(row.id, true)
      else if (rows[focusedIndex + 1]?.level === row.level + 1) focusRow(focusedIndex + 1)
      return true
    }
    if (key === 'ArrowLeft') {
      if (row.isExpanded) onToggle(row.id, false)
      else if (row.node.parentId !== null && indexById.has(row.node.parentId)) onFocusItem(row.node.parentId)
      return true
    }
    if (key === 'Enter' || key === ' ') {
      onSelect(row.id)
      if (key === 'Enter' && row.node.type === 'folder') onToggle(row.id, !row.isExpanded)
      return true
    }
    if (key === '*') {
      const parentId = row.node.parentId
      onExpandMany(
        rows
          .filter((other) => other.node.parentId === parentId && other.node.type === 'folder')
          .map((other) => other.id),
      )
      return true
    }
    if (key === 'Escape') {
      if (cutId === null) return false
      onCut(null)
      return true
    }
    // "/" is left to the page: it focuses the search.
    if (key.length === 1 && key.trim() && key !== '/') {
      // Typeahead: typing a name's first letters jumps to the next matching item.
      const recent = event.timeStamp - typeahead.current.time < TYPEAHEAD_RESET
      const text = (recent ? typeahead.current.text : '') + key.toLocaleLowerCase()
      typeahead.current = { text, time: event.timeStamp }
      const match = findByPrefix(text)
      if (match) onFocusItem(match.id)
      return true
    }
    return false
  }
}
