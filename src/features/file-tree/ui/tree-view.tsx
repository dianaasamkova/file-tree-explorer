import { useVirtualizer } from '@tanstack/react-virtual'
import { ChevronRight, Scissors } from 'lucide-react'
import {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type Ref,
} from 'react'
import { cn } from '@/lib/cn'
import { formatBytes } from '../model/format'
import { canMove, getDropTarget, moveErrorMessages, type MoveCheck } from '../model/move'
import { isDescendantOf } from '../model/tree'
import type { FolderTarget, NodeId, Tree } from '../model/types'
import type { VisibleRow } from '../model/visible'
import { FileIcon } from './file-icon'
import { Highlight } from './highlight'

const ROW_HEIGHT = 32
const INDENT = 20
const GUTTER = 6
const AUTO_EXPAND_DELAY = 600
const TYPEAHEAD_RESET = 600

export interface TreeViewHandle {
  focus(): void
}

export interface TreeViewProps {
  id: string
  label: string
  tree: Tree
  /** The rows on screen. Never empty: the parent shows an empty state instead of the tree. */
  rows: VisibleRow[]
  /** Falls back to the first row when it is null or not among `rows`. */
  focusedId: NodeId | null
  selectedId: NodeId | null
  cutId: NodeId | null
  query: string
  ref?: Ref<TreeViewHandle>
  onFocusItem(id: NodeId): void
  onSelect(id: NodeId): void
  onToggle(id: NodeId, expand: boolean): void
  onExpandMany(ids: NodeId[]): void
  onCut(id: NodeId | null): void
  onPaste(target: FolderTarget): void
  onMove(id: NodeId, target: FolderTarget): void
}

interface DropState {
  target: FolderTarget
  check: MoveCheck
  /** The row under the pointer; used to hide the hint when hovering the dragged item itself. */
  overId: NodeId | null
}

const treeItemId = (treeId: string, id: NodeId) => `${treeId}-item-${id}`

/**
 * WAI-ARIA tree with a single tab stop. Focus stays on the container and moves between items
 * with `aria-activedescendant`, which works with virtualization: only visible rows exist in the DOM.
 */
export function TreeView({
  id: treeId,
  label,
  tree,
  rows,
  focusedId,
  selectedId,
  cutId,
  query,
  ref,
  onFocusItem,
  onSelect,
  onToggle,
  onExpandMany,
  onCut,
  onPaste,
  onMove,
}: TreeViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [hasFocus, setHasFocus] = useState(false)
  const [keyboardMode, setKeyboardMode] = useState(true)
  const pointerDown = useRef(false)
  const typeahead = useRef({ text: '', time: 0 })
  const [dragId, setDragId] = useState<NodeId | null>(null)
  const [drop, setDrop] = useState<DropState | null>(null)
  const expandTimer = useRef<{ id: NodeId; timer: ReturnType<typeof setTimeout> } | null>(null)

  useImperativeHandle(ref, () => ({ focus: () => scrollRef.current?.focus() }), [])

  const indexById = useMemo(() => new Map(rows.map((row, index) => [row.id, index])), [rows])
  // Focus falls back to the first row when the focused item is filtered out or not set yet.
  const focusedIndex = indexById.get(focusedId ?? '') ?? 0
  const focusedRow = rows[focusedIndex]!

  // eslint-disable-next-line react-hooks/incompatible-library -- the component is not compiled by React Compiler.
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
    getItemKey: (index) => rows[index]!.id,
  })

  useEffect(() => {
    virtualizer.scrollToIndex(focusedIndex, { align: 'auto' })
  }, [focusedIndex, virtualizer])

  useEffect(() => () => clearTimeout(expandTimer.current?.timer), [])

  // The branch guide of the folder the selection lives in is drawn in the accent color.
  const activeFolder = selectedId === null ? null : getDropTarget(tree, selectedId)
  const activeGuide = activeFolder === null ? -1 : (rows[indexById.get(activeFolder) ?? -1]?.level ?? 0) - 1

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

  /** Runs the action for a key and reports whether the key was used. */
  const runKey = (event: KeyboardEvent<HTMLDivElement>): boolean => {
    const row = focusedRow
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

    const pageSize = Math.max(1, Math.floor(scrollRef.current!.clientHeight / ROW_HEIGHT) - 1)
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

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    setKeyboardMode(true)
    if (runKey(event)) {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  // Drag and drop. Every drop also has a keyboard path (Ctrl+X / Ctrl+V) and a single-pointer
  // path (the "Move to" picker), as WCAG 2.5.7 asks.
  const clearDrag = () => {
    clearTimeout(expandTimer.current?.timer)
    expandTimer.current = null
    setDragId(null)
    setDrop(null)
  }

  const updateDrop = (event: DragEvent, target: FolderTarget, overId: NodeId | null) => {
    if (dragId === null) return
    const check = canMove(tree, dragId, target)
    if (check.ok) {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
    }
    if (drop?.target !== target || drop.overId !== overId || drop.check.ok !== check.ok) {
      setDrop({ target, check, overId })
    }
  }

  const scheduleAutoExpand = (row: VisibleRow) => {
    if (expandTimer.current?.id === row.id) return
    clearTimeout(expandTimer.current?.timer)
    expandTimer.current = null
    if (row.node.type !== 'folder' || row.isExpanded || row.id === dragId) return
    expandTimer.current = { id: row.id, timer: setTimeout(() => onToggle(row.id, true), AUTO_EXPAND_DELAY) }
  }

  const handleDrop = (event: DragEvent) => {
    event.preventDefault()
    if (dragId !== null && drop?.check.ok) onMove(dragId, drop.target)
    clearDrag()
  }

  const showFocus = hasFocus && keyboardMode
  const hint = drop && !drop.check.ok && drop.overId !== dragId ? moveErrorMessages[drop.check.reason] : null
  const rootIsTarget = dragId !== null && drop?.target === null && drop.check.ok

  return (
    <div className="relative h-full">
      <div
        ref={scrollRef}
        id={treeId}
        role="tree"
        aria-label={label}
        aria-activedescendant={treeItemId(treeId, focusedRow.id)}
        tabIndex={0}
        className={cn(
          'h-full overflow-auto py-1 outline-none',
          rootIsTarget && 'bg-accent-soft/60 ring-accent ring-2 ring-inset',
        )}
        onKeyDown={handleKeyDown}
        onPointerDown={() => {
          pointerDown.current = true
          setKeyboardMode(false)
        }}
        onFocus={() => {
          setHasFocus(true)
          setKeyboardMode(!pointerDown.current)
          pointerDown.current = false
        }}
        onBlur={() => setHasFocus(false)}
        onDragOver={(event) => updateDrop(event, null, null)}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDrop(null)
        }}
        onDrop={handleDrop}
      >
        <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((item) => {
            const row = rows[item.index]!
            const { node } = row
            const isFolder = node.type === 'folder'
            const isSelected = row.id === selectedId
            const isDropTarget = dragId !== null && drop?.check.ok === true && drop.target === row.id
            const inActiveBranch = activeFolder !== null && isDescendantOf(tree, row.id, activeFolder)

            return (
              <div
                key={item.key}
                id={treeItemId(treeId, row.id)}
                role="treeitem"
                aria-level={row.level}
                aria-posinset={row.posInSet}
                aria-setsize={row.setSize}
                aria-expanded={isFolder ? row.isExpanded : undefined}
                aria-selected={isSelected}
                data-focused={row.id === focusedRow.id || undefined}
                draggable
                className={cn(
                  'group text-foreground absolute top-0 left-0 flex w-full cursor-default items-center gap-1.5 pr-3 text-sm select-none',
                  'hover:bg-hover',
                  isSelected && 'bg-accent-soft hover:bg-accent-soft font-medium',
                  row.id === cutId && 'opacity-55',
                  row.id === dragId && 'opacity-40',
                  isDropTarget && 'bg-accent-soft ring-accent ring-1 ring-inset',
                  showFocus && row.id === focusedRow.id && 'ring-accent ring-2 ring-inset',
                )}
                style={{ height: item.size, transform: `translateY(${item.start}px)` }}
                onClick={() => {
                  scrollRef.current?.focus()
                  onSelect(row.id)
                }}
                onDoubleClick={() => isFolder && onToggle(row.id, !row.isExpanded)}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'move'
                  event.dataTransfer.setData('text/plain', node.name)
                  setDragId(row.id)
                }}
                onDragEnd={clearDrag}
                onDragOver={(event) => {
                  event.stopPropagation()
                  updateDrop(event, getDropTarget(tree, row.id), row.id)
                  scheduleAutoExpand(row)
                }}
              >
                {Array.from({ length: row.level - 1 }, (_, depth) => (
                  <span
                    key={depth}
                    aria-hidden
                    className={cn(
                      'absolute inset-y-0 w-px',
                      depth === activeGuide && inActiveBranch ? 'bg-accent' : 'bg-guide',
                    )}
                    style={{ left: GUTTER + depth * INDENT + 12 }}
                  />
                ))}
                <span aria-hidden className="shrink-0" style={{ width: GUTTER + (row.level - 1) * INDENT }} />
                {isFolder ? (
                  <span
                    aria-hidden
                    data-testid="toggle"
                    className="text-muted hover:bg-border/70 hover:text-foreground grid size-6 shrink-0 place-items-center rounded"
                    onClick={(event) => {
                      event.stopPropagation()
                      onToggle(row.id, !row.isExpanded)
                    }}
                  >
                    <ChevronRight
                      className={cn('size-3.5 transition-transform duration-150', row.isExpanded && 'rotate-90')}
                    />
                  </span>
                ) : (
                  <span aria-hidden className="size-6 shrink-0" />
                )}
                <FileIcon node={node} open={row.isExpanded} />
                <span className="min-w-0 flex-1 truncate">
                  <Highlight text={node.name} query={query} />
                </span>
                {row.id === cutId && <Scissors aria-label="Cut" className="text-muted size-3.5 shrink-0" />}
                {node.type === 'file' && (
                  <span className="text-muted shrink-0 text-xs font-normal tabular-nums">{formatBytes(node.size)}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
      {hint && (
        <p
          aria-hidden
          className="bg-foreground text-background pointer-events-none absolute inset-x-3 bottom-3 rounded-md px-3 py-2 text-xs shadow-lg"
        >
          Can't move here. {hint}
        </p>
      )}
    </div>
  )
}
