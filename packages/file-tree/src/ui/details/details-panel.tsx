import { ChevronRight } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { Button, Kbd, MOD_KEY } from '@fte/ui'
import { formatBytes, formatDate, getFileKind, getKindLabel, pluralize } from '../../model/format'
import { getFolderStats, getPath, ROOT_LABEL } from '../../model/tree'
import type { FolderTarget, NodeId, Tree, TreeNode } from '../../model/types'
import { FileIcon } from '../shared/file-icon'
import { MoveToForm } from './move-to-form'

export interface DetailsPanelProps {
  tree: Tree
  selectedId: NodeId | null
  onReveal(id: NodeId): void
  onMove(id: NodeId, target: FolderTarget): void
}

const shortcuts: [keys: string[], action: string][] = [
  [['↑', '↓'], 'Move between items'],
  [['→', '←'], 'Open or close a folder'],
  [['Enter'], 'Select'],
  [[MOD_KEY, 'X'], 'Cut the focused item'],
  [[MOD_KEY, 'V'], 'Paste into the focused folder'],
  [['/'], 'Search'],
]

export function DetailsPanel({ tree, selectedId, onReveal, onMove }: DetailsPanelProps) {
  const node = selectedId === null ? undefined : tree.nodes[selectedId]
  return (
    <PanelFrame>
      {node ? (
        <NodeDetails key={node.id} tree={tree} node={node} onReveal={onReveal} onMove={onMove} />
      ) : (
        <NothingSelected />
      )}
    </PanelFrame>
  )
}

/** The panel while the drive is loading or failed to load. */
export function DetailsPlaceholder() {
  return (
    <PanelFrame>
      <NothingSelected />
    </PanelFrame>
  )
}

function PanelFrame({ children }: { children: ReactNode }) {
  const headingId = useId()
  return (
    <aside
      aria-labelledby={headingId}
      className="border-border bg-surface flex min-h-0 flex-col overflow-y-auto border-t md:border-t-0 md:border-l"
    >
      <h2 id={headingId} className="sr-only">
        Details
      </h2>
      {children}
    </aside>
  )
}

function NothingSelected() {
  return (
    <div className="p-5">
      <p className="font-medium">Nothing selected</p>
      <p className="text-muted mt-1 text-sm">Select a file or folder to see its size, location and actions.</p>
      <dl className="mt-6 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2.5 text-sm">
        {shortcuts.map(([keys, action]) => (
          <div key={action} className="contents">
            <dt className="flex gap-1">
              {keys.map((key) => (
                <Kbd key={key}>{key}</Kbd>
              ))}
            </dt>
            <dd className="text-muted">{action}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function NodeDetails({
  tree,
  node,
  onReveal,
  onMove,
}: {
  tree: Tree
  node: TreeNode
  onReveal(id: NodeId): void
  onMove(id: NodeId, target: FolderTarget): void
}) {
  const kind = getFileKind(node)
  const path = getPath(tree, node.id).slice(0, -1)
  const stats = node.type === 'folder' ? getFolderStats(tree, node.id) : null

  return (
    <div className="flex flex-col gap-6 p-5">
      <div className="flex items-start gap-3">
        <span className="bg-background border-border grid size-11 shrink-0 place-items-center rounded-lg border">
          <FileIcon node={node} className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-lg leading-snug font-semibold break-words">{node.name}</p>
          <p className="text-muted text-sm">{getKindLabel(kind)}</p>
        </div>
      </div>

      <dl className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-2 text-sm">
        {node.type === 'file' ? (
          <>
            <dt className="text-muted">Size</dt>
            <dd className="tabular-nums">{formatBytes(node.size)}</dd>
            <dt className="text-muted">Modified</dt>
            <dd>{formatDate(node.modifiedAt)}</dd>
          </>
        ) : (
          stats && (
            <>
              <dt className="text-muted">Contains</dt>
              <dd>
                {stats.files + stats.folders === 0
                  ? 'Empty'
                  : `${pluralize(stats.folders, 'folder')}, ${pluralize(stats.files, 'file')}`}
              </dd>
              <dt className="text-muted">Total size</dt>
              <dd className="tabular-nums">{formatBytes(stats.bytes)}</dd>
            </>
          )
        )}
        <dt className="text-muted">Location</dt>
        <dd>
          <nav aria-label="Location">
            <ol className="flex flex-wrap items-center gap-x-0.5">
              <li className="text-muted">{ROOT_LABEL}</li>
              {path.map((folder) => (
                <li key={folder.id} className="flex items-center gap-x-0.5">
                  <ChevronRight aria-hidden className="text-muted size-3.5" />
                  <Button variant="link" className="text-sm font-normal" onClick={() => onReveal(folder.id)}>
                    {folder.name}
                  </Button>
                </li>
              ))}
            </ol>
          </nav>
        </dd>
      </dl>

      <MoveToForm tree={tree} node={node} onMove={onMove} />
    </div>
  )
}
