import { FolderSearch, RefreshCw, TriangleAlert } from 'lucide-react'
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useUrlState } from '@/hooks/use-url-state'
import type { DatasetId } from '../api/mock-api'
import { useMoveMutation, useTreeQuery } from '../api/queries'
import { canMove, moveErrorMessages } from '../model/move'
import { getAncestorIds, getDisplayName } from '../model/tree'
import type { FolderTarget, NodeId, Tree } from '../model/types'
import { getVisibleRows, searchTree } from '../model/visible'
import {
  getExpandedIds,
  useExplorerState,
  type ExplorerAction,
  type ExplorerState,
  type ExpansionMode,
} from '../state/explorer-state'
import { DetailsPanel, DetailsPlaceholder } from './details-panel'
import { SearchBox } from './search-box'
import { StatusBar } from './status-bar'
import { TreeView, type TreeViewHandle } from './tree-view'

export const TREE_ID = 'file-tree'

const urlKeys = ['q', 'file'] as const

/**
 * The explorer screen. It wires three kinds of state together:
 * server state (TanStack Query), UI state (a reducer) and shareable state (the URL).
 * The search and the UI state live here, so they survive while the tree loads or reloads.
 */
export function FileTreeExplorer({ dataset }: { dataset: DatasetId }) {
  const [initialUrl, writeUrl] = useUrlState(urlKeys)
  const [query, setQuery] = useState(initialUrl.q ?? '')
  const [state, dispatch] = useExplorerState(initialUrl.file)
  const treeQuery = useTreeQuery(dataset)

  useEffect(() => {
    writeUrl({ q: query.trim() || null, file: state.selectedId })
  }, [writeUrl, query, state.selectedId])

  const changeQuery = useCallback(
    (value: string) => {
      setQuery(value)
      dispatch({ type: 'searchChanged' })
    },
    [dispatch],
  )

  // The search box stays mounted at the same place while the content around it switches from
  // loading to loaded, so typing during the first load keeps focus and text.
  return (
    <div className="explorer-grid min-h-0 flex-1">
      <div role="search" className="border-border border-b p-3 [grid-area:search]">
        <SearchBox value={query} onChange={changeQuery} />
      </div>
      {/* Data wins over an error: if a background refresh fails, the tree the user is working in stays. */}
      {treeQuery.data ? (
        <LoadedExplorer
          dataset={dataset}
          tree={treeQuery.data}
          query={query}
          onQueryChange={changeQuery}
          state={state}
          dispatch={dispatch}
        />
      ) : (
        <ExplorerSlots
          main={
            treeQuery.isError ? (
              <ErrorState message={treeQuery.error.message} onRetry={() => void treeQuery.refetch()} />
            ) : (
              <LoadingState />
            )
          }
          details={<DetailsPlaceholder />}
          status={<StatusBar total={null} matches={null} query="" cutNode={undefined} />}
        />
      )}
    </div>
  )
}

interface LoadedExplorerProps {
  dataset: DatasetId
  tree: Tree
  query: string
  onQueryChange(value: string): void
  state: ExplorerState
  dispatch: Dispatch<ExplorerAction>
}

/** Everything that needs the tree; it only renders once the tree has loaded. */
function LoadedExplorer({ dataset, tree, query, onQueryChange, state, dispatch }: LoadedExplorerProps) {
  // Typing stays responsive on 10,000 items: filtering renders at a lower priority.
  const deferredQuery = useDeferredValue(query)
  const move = useMoveMutation(dataset)
  const treeRef = useRef<TreeViewHandle>(null)

  const search = useMemo(() => searchTree(tree, deferredQuery), [tree, deferredQuery])
  const mode: ExpansionMode = search ? 'search' : 'browse'
  // Only the expansion fields: focus and selection change on every key press and don't affect the rows.
  const { expandedIds: browseExpandedIds, search: searchExpansion } = state
  const expandedIds = useMemo(
    () => getExpandedIds({ expandedIds: browseExpandedIds, search: searchExpansion }, search),
    [browseExpandedIds, searchExpansion, search],
  )
  const rows = useMemo(() => getVisibleRows(tree, expandedIds, search?.visibleIds), [tree, expandedIds, search])

  // A shared link (?file=…) opens the folders above the item. Only once: later the tree changes with every move.
  const linkHandled = useRef(false)
  useEffect(() => {
    if (linkHandled.current) return
    linkHandled.current = true
    const id = state.selectedId
    if (id === null) return
    if (tree.nodes[id]) dispatch({ type: 'reveal', id, ancestorIds: getAncestorIds(tree, id) })
    else dispatch({ type: 'select', id: null })
  }, [tree, state.selectedId, dispatch])

  const moveItem = (id: NodeId, target: FolderTarget) => {
    const check = canMove(tree, id, target)
    if (!check.ok) {
      toast.error(`Couldn't move “${getDisplayName(tree, id)}”`, { description: moveErrorMessages[check.reason] })
      return
    }
    move.mutate({ id, target })
    if (target !== null) dispatch({ type: 'expand', ids: [target], mode })
    if (state.cutId === id) dispatch({ type: 'cut', id: null })
  }

  const reveal = (id: NodeId) => {
    dispatch({ type: 'reveal', id, ancestorIds: getAncestorIds(tree, id) })
    treeRef.current?.focus()
  }

  return (
    <ExplorerSlots
      main={
        rows.length === 0 ? (
          <EmptyState query={search ? query : null} onClear={() => onQueryChange('')} />
        ) : (
          <TreeView
            ref={treeRef}
            id={TREE_ID}
            label="Files"
            tree={tree}
            rows={rows}
            focusedId={state.focusedId}
            selectedId={state.selectedId}
            cutId={state.cutId}
            query={search ? deferredQuery : ''}
            onFocusItem={(id) => dispatch({ type: 'focus', id })}
            onSelect={(id) => dispatch({ type: 'select', id })}
            onToggle={(id, expand) =>
              dispatch(expand ? { type: 'expand', ids: [id], mode } : { type: 'collapse', id, mode })
            }
            onExpandMany={(ids) => dispatch({ type: 'expand', ids, mode })}
            onCut={(id) => dispatch({ type: 'cut', id })}
            onPaste={(target) => state.cutId !== null && moveItem(state.cutId, target)}
            onMove={moveItem}
          />
        )
      }
      details={<DetailsPanel tree={tree} selectedId={state.selectedId} onReveal={reveal} onMove={moveItem} />}
      status={
        <StatusBar
          total={Object.keys(tree.nodes).length}
          matches={search ? search.matchIds.size : null}
          query={deferredQuery}
          cutNode={state.cutId === null ? undefined : tree.nodes[state.cutId]}
        />
      }
    />
  )
}

/** Places the parts of the screen in the explorer grid (see `.explorer-grid` in index.css). */
function ExplorerSlots({ main, details, status }: Record<'main' | 'details' | 'status', ReactNode>) {
  return (
    <>
      <section aria-label="Files" className="min-h-0 [grid-area:main]">
        {main}
      </section>
      <div className="flex min-h-0 [grid-area:details] *:flex-1">{details}</div>
      <div className="[grid-area:status]">{status}</div>
    </>
  )
}

function LoadingState() {
  return (
    <div aria-busy="true" className="flex flex-col gap-2 p-3">
      <span className="sr-only">Loading files…</span>
      {[40, 55, 35, 62, 48, 30, 52, 44].map((width, index) => (
        <div key={index} className="flex h-6 items-center gap-2" style={{ paddingLeft: index % 3 === 2 ? 26 : 6 }}>
          <Skeleton className="size-4" />
          <Skeleton className="h-3.5" style={{ width: `${width}%` }} />
        </div>
      ))}
    </div>
  )
}

/** Shown only when nothing has loaded. Retrying puts the query back to pending, which shows the skeleton. */
function ErrorState({ message, onRetry }: { message: string; onRetry(): void }) {
  return (
    <div role="alert" className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <TriangleAlert aria-hidden className="text-danger size-6" />
      <div>
        <p className="font-medium">Couldn't load files</p>
        <p className="text-muted mt-1 text-sm">{message}</p>
      </div>
      <Button onClick={onRetry}>
        <RefreshCw />
        Retry
      </Button>
    </div>
  )
}

function EmptyState({ query, onClear }: { query: string | null; onClear(): void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <FolderSearch aria-hidden className="text-muted size-6" />
      {query === null ? (
        <p className="font-medium">This drive is empty</p>
      ) : (
        <>
          <div>
            <p className="font-medium">No files or folders match “{query.trim()}”</p>
            <p className="text-muted mt-1 text-sm">Check the spelling, or search for part of a name.</p>
          </div>
          <Button onClick={onClear}>Clear search</Button>
        </>
      )}
    </div>
  )
}
