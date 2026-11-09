import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { moveNode } from '../model/move'
import { normalizeTree } from '../model/tree'
import type { FolderTarget, NodeId, Tree } from '../model/types'
import { useApi } from './api-context'
import type { DatasetId } from './mock-api'

export const ROOT_LABEL = 'Drive'

export const treeQueryKey = (dataset: DatasetId) => ['tree', dataset] as const

/** Server state: the whole drive, normalized once when it arrives. */
export function useTreeQuery(dataset: DatasetId) {
  const api = useApi()
  return useQuery({
    queryKey: treeQueryKey(dataset),
    queryFn: async ({ signal }) => normalizeTree(await api.getTree(dataset, signal)),
    staleTime: 60_000,
  })
}

export interface MoveVariables {
  id: NodeId
  target: FolderTarget
  /** True when this move reverts an earlier one; it then gets no Undo of its own. */
  isUndo?: boolean
}

interface MoveContext {
  previous: Tree | undefined
  name: string
  from: FolderTarget
  targetName: string
}

const folderName = (tree: Tree | undefined, id: FolderTarget) =>
  id === null ? ROOT_LABEL : (tree?.nodes[id]?.name ?? 'the folder')

/**
 * Moves an item with an optimistic update: the tree changes at once, rolls back if the server
 * refuses, and every successful move can be undone from the toast.
 */
export function useMoveMutation(dataset: DatasetId) {
  const api = useApi()
  const queryClient = useQueryClient()
  const queryKey = treeQueryKey(dataset)

  const mutation = useMutation<unknown, Error, MoveVariables, MoveContext>({
    mutationFn: ({ id, target }) => api.moveNode(dataset, id, target),

    onMutate: async ({ id, target }) => {
      // A refetch in flight would overwrite the optimistic tree with stale data.
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Tree>(queryKey)
      const node = previous?.nodes[id]
      if (previous && node) queryClient.setQueryData<Tree>(queryKey, moveNode(previous, id, target))
      return {
        previous,
        name: node?.name ?? 'Item',
        from: node?.parentId ?? null,
        targetName: folderName(previous, target),
      }
    },

    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
      toast.error(`Couldn't move “${context?.name ?? 'item'}”`, { description: error.message })
    },

    onSuccess: (_data, { id, isUndo }, context) => {
      if (isUndo) {
        toast.success(`Moved “${context.name}” back to ${context.targetName}`)
        return
      }
      toast.success(`Moved “${context.name}” to ${context.targetName}`, {
        action: {
          label: 'Undo',
          onClick: () => mutation.mutate({ id, target: context.from, isUndo: true }),
        },
      })
    },

    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })

  return mutation
}
