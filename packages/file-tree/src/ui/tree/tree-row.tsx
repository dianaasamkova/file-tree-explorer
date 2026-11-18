import { cn } from '@fte/ui'
import { ChevronRight, Scissors } from 'lucide-react'
import type { DragEvent } from 'react'
import { formatBytes } from '../../model/format'
import type { VisibleRow } from '../../model/visible'
import { FileIcon } from '../shared/file-icon'
import { Highlight } from '../shared/highlight'

const INDENT = 20
const GUTTER = 6

export interface TreeRowProps {
  /** The element id `aria-activedescendant` points to. */
  id: string
  row: VisibleRow
  /** Position and height from the virtualizer. */
  start: number
  size: number
  query: string
  isSelected: boolean
  /** The keyboard focus is on this row. */
  isFocused: boolean
  /** Draw the focus ring: the tree has focus and is used with the keyboard. */
  showFocusRing: boolean
  isCut: boolean
  isDragged: boolean
  isDropTarget: boolean
  /** The depth of the indentation guide to draw in the accent colour, or -1. */
  activeGuide: number
  dragProps: {
    draggable: boolean
    onDragStart(event: DragEvent): void
    onDragEnd(): void
    onDragOver(event: DragEvent): void
  }
  onSelect(): void
  onToggle(): void
}

/** One `treeitem`: indentation guides, chevron, icon, highlighted name and size. */
export function TreeRow({
  id,
  row,
  start,
  size,
  query,
  isSelected,
  isFocused,
  showFocusRing,
  isCut,
  isDragged,
  isDropTarget,
  activeGuide,
  dragProps,
  onSelect,
  onToggle,
}: TreeRowProps) {
  const { node } = row
  const isFolder = node.type === 'folder'

  return (
    <div
      id={id}
      role="treeitem"
      aria-level={row.level}
      aria-posinset={row.posInSet}
      aria-setsize={row.setSize}
      aria-expanded={isFolder ? row.isExpanded : undefined}
      aria-selected={isSelected}
      data-focused={isFocused || undefined}
      className={cn(
        'group text-foreground absolute top-0 left-0 flex w-full cursor-default items-center gap-1.5 pr-3 text-sm select-none',
        'hover:bg-hover',
        isSelected && 'bg-accent-soft hover:bg-accent-soft font-medium',
        isCut && 'opacity-55',
        isDragged && 'opacity-40',
        isDropTarget && 'bg-accent-soft ring-accent ring-1 ring-inset',
        showFocusRing && isFocused && 'ring-accent ring-2 ring-inset',
      )}
      style={{ height: size, transform: `translateY(${start}px)` }}
      onClick={onSelect}
      onDoubleClick={() => isFolder && onToggle()}
      {...dragProps}
    >
      {Array.from({ length: row.level - 1 }, (_, depth) => (
        <span
          key={depth}
          aria-hidden
          className={cn('absolute inset-y-0 w-px', depth === activeGuide ? 'bg-accent' : 'bg-guide')}
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
            onToggle()
          }}
        >
          <ChevronRight className={cn('size-3.5 transition-transform duration-150', row.isExpanded && 'rotate-90')} />
        </span>
      ) : (
        <span aria-hidden className="size-6 shrink-0" />
      )}
      <FileIcon node={node} open={row.isExpanded} />
      <span className="min-w-0 flex-1 truncate">
        <Highlight text={node.name} query={query} />
      </span>
      {isCut && <Scissors aria-label="Cut" className="text-muted size-3.5 shrink-0" />}
      {node.type === 'file' && (
        <span className="text-muted shrink-0 text-xs font-normal tabular-nums">{formatBytes(node.size)}</span>
      )}
    </div>
  )
}
