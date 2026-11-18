import { cn } from '@fte/ui'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useEffectEvent, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react'
import { getDropTarget } from '../../model/move'
import { isDescendantOf } from '../../model/tree'
import type { FolderTarget, NodeId, Tree } from '../../model/types'
import type { VisibleRow } from '../../model/visible'
import { TreeRow } from './tree-row'
import { useTreeDragDrop } from './use-tree-drag-drop'
import { useTreeKeyboard } from './use-tree-keyboard'
import { withPinnedIndexes } from './virtual-range'

const ROW_HEIGHT = 32

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

const treeItemId = (treeId: string, id: NodeId) => `${treeId}-item-${id}`

/**
 * WAI-ARIA tree with a single tab stop. Focus stays on the container and moves between items
 * with `aria-activedescendant`, which works with virtualization: only visible rows exist in the DOM.
 *
 * This component owns focus, scrolling and virtualization; the keyboard model, drag and drop,
 * and the row itself live in their own modules next to it.
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

  useImperativeHandle(ref, () => ({ focus: () => scrollRef.current?.focus() }), [])

  const indexById = useMemo(() => new Map(rows.map((row, index) => [row.id, index])), [rows])
  // Focus falls back to the first row when the focused item is filtered out or not set yet.
  const focusedIndex = indexById.get(focusedId ?? '') ?? 0
  const focusedRow = rows[focusedIndex]!

  const dragDrop = useTreeDragDrop({ tree, scrollRef, onToggle, onMove })
  const dragIndex = dragDrop.dragId === null ? undefined : indexById.get(dragDrop.dragId)

  const handleKey = useTreeKeyboard({
    tree,
    rows,
    focusedIndex,
    indexById,
    cutId,
    getPageSize: () => Math.max(1, Math.floor(scrollRef.current!.clientHeight / ROW_HEIGHT) - 1),
    onFocusItem,
    onSelect,
    onToggle,
    onExpandMany,
    onCut,
    onPaste,
  })

  // eslint-disable-next-line react-hooks/incompatible-library -- the component is not compiled by React Compiler.
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
    getItemKey: (index) => rows[index]!.id,
    // The focused and the dragged rows stay in the DOM wherever the tree scrolls.
    rangeExtractor: (range) => withPinnedIndexes(range, [focusedIndex, dragIndex]),
  })

  // Scroll when focus moves to another item, not when rows are added or removed around it:
  // that would pull the view back while the user scrolls or drags elsewhere.
  const scrollToFocused = useEffectEvent(() => virtualizer.scrollToIndex(focusedIndex, { align: 'auto' }))
  useEffect(() => scrollToFocused(), [focusedRow.id])

  // The indentation guide of the folder the selection lives in is drawn in the accent colour.
  const activeFolder = selectedId === null ? null : getDropTarget(tree, selectedId)
  const activeGuide = activeFolder === null ? -1 : (rows[indexById.get(activeFolder) ?? -1]?.level ?? 0) - 1

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
          dragDrop.rootIsTarget && 'bg-accent-soft/60 ring-accent ring-2 ring-inset',
        )}
        onKeyDown={(event) => {
          setKeyboardMode(true)
          if (handleKey(event)) {
            event.preventDefault()
            event.stopPropagation()
          }
        }}
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
        {...dragDrop.containerProps}
      >
        <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((item) => {
            const row = rows[item.index]!
            const inActiveBranch = activeFolder !== null && isDescendantOf(tree, row.id, activeFolder)
            return (
              <TreeRow
                key={item.key}
                id={treeItemId(treeId, row.id)}
                row={row}
                start={item.start}
                size={item.size}
                query={query}
                isSelected={row.id === selectedId}
                isFocused={row.id === focusedRow.id}
                showFocusRing={hasFocus && keyboardMode}
                isCut={row.id === cutId}
                isDragged={row.id === dragDrop.dragId}
                isDropTarget={dragDrop.isDropTarget(row.id)}
                activeGuide={inActiveBranch ? activeGuide : -1}
                dragProps={dragDrop.rowProps(row)}
                onSelect={() => {
                  scrollRef.current?.focus()
                  onSelect(row.id)
                }}
                onToggle={() => onToggle(row.id, !row.isExpanded)}
              />
            )
          })}
        </div>
      </div>
      {dragDrop.hint && (
        <p
          aria-hidden
          className="bg-foreground text-background pointer-events-none absolute inset-x-3 bottom-3 rounded-md px-3 py-2 text-xs shadow-lg"
        >
          Can't move here. {dragDrop.hint}
        </p>
      )}
    </div>
  )
}
