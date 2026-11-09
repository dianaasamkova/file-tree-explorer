import { FolderSearch, RefreshCw, TriangleAlert } from 'lucide-react'
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useUrlState } from '@/hooks/use-url-state'
import type { DatasetId } from '../api/mock-api'
import { useMoveMutation, useTreeQuery } from '../api/queries'
import { canMove, moveErrorMessages } from '../model/move'
import { getAncestorIds } from '../model/tree'
import type { FolderTarget, NodeId } from '../model/types'
import { getVisibleRows, searchTree } from '../model/visible'
import { getExpandedIds, useExplorerState, type ExpansionMode } from '../state/explorer-state'
import { DetailsPanel } from './details-panel'
import { SearchBox } from './search-box'
import { StatusBar } from './status-bar'
import { TreeView, type TreeViewHandle } from './tree-view'

export const TREE_ID = 'file-tree'

const urlKeys = ['q', 'file'] as const

/**
 * The explorer screen. It wires three kinds of state together:
 * server state (TanStack Query), UI state (a reducer) and shareable state (the URL).
 */
export function FileTreeExplorer({ dataset }: { dataset: DatasetId }) {
  const [initialUrl, writeUrl] = useUrlState(urlKeys)
  const [query, setQuery] = useState(initialUrl.q ?? '')
  // Typing stays responsive on 10,000 items: filtering renders at a lower priority.
  const deferredQuery = useDeferredValue(query)
  const [state, dispatch] = useExplorerState(initialUrl.file)
  const treeQuery = useTreeQuery(dataset)
  const tree = treeQuery.data
  const move = useMoveMutation(dataset)
  const treeRef = useRef<TreeViewHandle>(null)

  const search = useMemo(() => (tree ? searchTree(tree, deferredQuery) : null), [tree, deferredQuery])
  const mode: ExpansionMode = search ? 'search' : 'browse'
  const expandedIds = useMemo(() => getExpandedIds(state, search), [state, search])
  const rows = useMemo(
    () => (tree ? getVisibleRows(tree, expandedIds, search?.visibleIds) : []),
    [tree, expandedIds, search],
  )

  useEffect(() => {
    writeUrl({ q: query.trim() || null, file: state.selectedId })
  }, [writeUrl, query, state.selectedId])

  // A shared link (?file=…) opens the folders above the item once the tree has loaded.
  const linkHandled = useRef(false)
  useEffect(() => {
    if (!tree || linkHandled.current) return
    linkHandled.current = true
    const id = state.selectedId
    if (id === null) return
    if (tree.nodes[id]) dispatch({ type: 'reveal', id, ancestorIds: getAncestorIds(tree, id) })
    else dispatch({ type: 'select', id: null })
  }, [tree, state.selectedId, dispatch])

  const changeQuery = useCallback(
    (value: string) => {
      setQuery(value)
      dispatch({ type: 'searchChanged' })
    },
    [dispatch],
  )

  const moveItem = (id: NodeId, target: FolderTarget) => {
    if (!tree) return
    const check = canMove(tree, id, target)
    if (!check.ok) {
      toast.error(`Couldn't move “${tree.nodes[id]?.name ?? 'item'}”`, {
        description: moveErrorMessages[check.reason],
      })
      return
    }
    move.mutate({ id, target })
    if (target !== null) dispatch({ type: 'expand', ids: [target], mode })
    if (state.cutId === id) dispatch({ type: 'cut', id: null })
  }

  const reveal = (id: NodeId) => {
    if (!tree) return
    if (search && !search.visibleIds.has(id)) changeQuery('')
    dispatch({ type: 'reveal', id, ancestorIds: getAncestorIds(tree, id) })
    treeRef.current?.focus()
  }

  const focusedId =
    state.focusedId !== null && rows.some((row) => row.id === state.focusedId) ? state.focusedId : (rows[0]?.id ?? null)

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <section aria-label="Files" className="flex h-[65vh] min-h-0 flex-col md:h-auto md:flex-1">
          <div className="border-border border-b p-3">
            <SearchBox value={query} onChange={changeQuery} />
          </div>
          <div className="min-h-0 flex-1">
            {treeQuery.isPending ? (
              <LoadingState />
            ) : treeQuery.isError ? (
              <ErrorState
                message={treeQuery.error.message}
                retrying={treeQuery.isFetching}
                onRetry={() => void treeQuery.refetch()}
              />
            ) : rows.length === 0 ? (
              <EmptyState query={search ? query : null} onClear={() => changeQuery('')} />
            ) : (
              <TreeView
                ref={treeRef}
                id={TREE_ID}
                label="Files"
                tree={treeQuery.data}
                rows={rows}
                focusedId={focusedId}
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
            )}
          </div>
        </section>
        <DetailsPanel tree={tree} selectedId={state.selectedId} onReveal={reveal} onMove={moveItem} />
      </div>
      <StatusBar
        total={tree ? Object.keys(tree.nodes).length : null}
        matches={search ? search.matchIds.size : null}
        query={deferredQuery}
        cutNode={state.cutId === null ? undefined : tree?.nodes[state.cutId]}
      />
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

function ErrorState({ message, retrying, onRetry }: { message: string; retrying: boolean; onRetry(): void }) {
  return (
    <div role="alert" className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <TriangleAlert aria-hidden className="text-danger size-6" />
      <div>
        <p className="font-medium">Couldn't load files</p>
        <p className="text-muted mt-1 text-sm">{message}</p>
      </div>
      <Button onClick={onRetry} disabled={retrying}>
        <RefreshCw className={retrying ? 'animate-spin' : undefined} />
        {retrying ? 'Retrying…' : 'Retry'}
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
