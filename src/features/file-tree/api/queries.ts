import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { canMove, moveNode } from '../model/move'
import { getDisplayName, normalizeTree } from '../model/tree'
import type { FolderTarget, NodeId, Tree } from '../model/types'
import { useApi } from './api-context'
import type { DatasetId } from './mock-api'

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
  /** Whether the optimistic move was applied to the cached tree (it isn't when nothing is cached). */
  applied: boolean
  name: string
  from: FolderTarget
  targetName: string
}

export const moveMutationKey = (dataset: DatasetId) => ['move', dataset] as const

/**
 * Moves an item with an optimistic update: the tree changes at once, rolls back if the server
 * refuses, and every successful move can be undone from the toast.
 *
 * Several moves can be in flight at once, so neither step may touch the others: a failed move
 * reverts only itself on the current tree, and the tree is refetched only after the last
 * pending move settles, so a refetch can't overwrite a move the server hasn't applied yet.
 */
export function useMoveMutation(dataset: DatasetId) {
  const api = useApi()
  const queryClient = useQueryClient()
  const queryKey = treeQueryKey(dataset)
  const mutationKey = moveMutationKey(dataset)

  const mutation = useMutation<unknown, Error, MoveVariables, MoveContext>({
    mutationKey,
    mutationFn: ({ id, target }) => api.moveNode(dataset, id, target),

    onMutate: async ({ id, target }) => {
      // A refetch in flight would overwrite the optimistic tree with stale data.
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Tree>(queryKey)
      // moveNode throws on a move that breaks a rule: the mutation then fails before reaching the server.
      if (previous) queryClient.setQueryData<Tree>(queryKey, moveNode(previous, id, target))
      return {
        applied: previous !== undefined,
        name: getDisplayName(previous, id),
        from: previous?.nodes[id]?.parentId ?? null,
        targetName: getDisplayName(previous, target),
      }
    },

    onError: (error, { id, target }, context) => {
      // Without a context, onMutate itself failed and nothing was changed.
      if (context?.applied) {
        const current = queryClient.getQueryData<Tree>(queryKey)!
        // Undo only this move, keeping other moves still in flight. If that's no longer possible
        // (the item was moved again, or its old folder now has an item with the same name),
        // the server's tree is the only safe answer.
        const canRevert = current.nodes[id]?.parentId === target && canMove(current, id, context.from).ok
        if (canRevert) queryClient.setQueryData<Tree>(queryKey, moveNode(current, id, context.from))
        else void queryClient.invalidateQueries({ queryKey })
      }
      const name = context?.name ?? getDisplayName(queryClient.getQueryData<Tree>(queryKey), id)
      toast.error(`Couldn't move “${name}”`, { description: error.message })
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

    // This mutation still counts as pending here, so 1 means it is the last one.
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey }) === 1) return queryClient.invalidateQueries({ queryKey })
    },
  })

  return mutation
}
