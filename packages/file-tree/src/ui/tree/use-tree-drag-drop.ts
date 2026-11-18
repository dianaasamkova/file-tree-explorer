import { useEffect, useRef, useState, type DragEvent, type RefObject } from 'react'
import { canMove, getDropTarget, moveErrorMessages, type MoveCheck } from '../../model/move'
import type { FolderTarget, NodeId, Tree } from '../../model/types'
import type { VisibleRow } from '../../model/visible'
import { useDragAutoScroll } from './use-drag-auto-scroll'

const AUTO_EXPAND_DELAY = 600

interface DropState {
  target: FolderTarget
  check: MoveCheck
  /** The row under the pointer; used to hide the hint when hovering the dragged item itself. */
  overId: NodeId | null
}

export interface TreeDragDropOptions {
  tree: Tree
  scrollRef: RefObject<HTMLElement | null>
  onToggle(id: NodeId, expand: boolean): void
  onMove(id: NodeId, target: FolderTarget): void
}

/**
 * Native drag and drop for the tree: a drop on a folder moves into it, on a file into the file's
 * folder, and on empty space to the root. Hovering a folder opens it, holding an item near an edge
 * scrolls, and an invalid target says why. Every drop also has a keyboard path (cut and paste) and
 * a single-pointer path (the "Move to" picker), as WCAG 2.5.7 asks.
 */
export function useTreeDragDrop({ tree, scrollRef, onToggle, onMove }: TreeDragDropOptions) {
  const [dragId, setDragId] = useState<NodeId | null>(null)
  const [drop, setDrop] = useState<DropState | null>(null)
  const expandTimer = useRef<{ id: NodeId; timer: ReturnType<typeof setTimeout> } | null>(null)
  const autoScroll = useDragAutoScroll(scrollRef)

  useEffect(() => () => clearTimeout(expandTimer.current?.timer), [])

  const cancelAutoExpand = () => {
    clearTimeout(expandTimer.current?.timer)
    expandTimer.current = null
  }

  /** Opens a collapsed folder that an item from this tree is held over for a moment. */
  const scheduleAutoExpand = (row: VisibleRow) => {
    if (dragId === null || expandTimer.current?.id === row.id) return
    cancelAutoExpand()
    if (row.node.type !== 'folder' || row.isExpanded || row.id === dragId) return
    expandTimer.current = { id: row.id, timer: setTimeout(() => onToggle(row.id, true), AUTO_EXPAND_DELAY) }
  }

  const clearDrag = () => {
    autoScroll.stop()
    cancelAutoExpand()
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

  return {
    dragId,
    /** Why the current target refuses the drop, or null. */
    hint: drop && !drop.check.ok && drop.overId !== dragId ? moveErrorMessages[drop.check.reason] : null,
    rootIsTarget: dragId !== null && drop?.target === null && drop.check.ok,
    isDropTarget: (id: NodeId) => dragId !== null && drop?.check.ok === true && drop.target === id,

    /** Handlers for the tree's scroll container: empty space means the root. */
    containerProps: {
      // Capture phase: rows stop the bubbling dragover, but the tree scrolls whichever row is under the pointer.
      onDragOverCapture: (event: DragEvent) => {
        if (dragId !== null) autoScroll.update(event.clientY)
      },
      onDragOver: (event: DragEvent) => updateDrop(event, null, null),
      onDragLeave: (event: DragEvent) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
        autoScroll.stop()
        cancelAutoExpand()
        setDrop(null)
      },
      onDrop: (event: DragEvent) => {
        event.preventDefault()
        if (dragId !== null && drop?.check.ok) onMove(dragId, drop.target)
        clearDrag()
      },
    },

    /** Handlers for one row. */
    rowProps: (row: VisibleRow) => ({
      draggable: true,
      onDragStart: (event: DragEvent) => {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', row.node.name)
        setDragId(row.id)
      },
      onDragEnd: clearDrag,
      onDragOver: (event: DragEvent) => {
        event.stopPropagation()
        updateDrop(event, getDropTarget(tree, row.id), row.id)
        scheduleAutoExpand(row)
      },
    }),
  }
}
