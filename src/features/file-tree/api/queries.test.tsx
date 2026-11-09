import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { normalizeTree } from '../model/tree'
import type { Tree } from '../model/types'
import { ApiProvider, useApi } from './api-context'
import { createSampleDataset } from './datasets/sample'
import { ApiError, createMockApi } from './mock-api'
import { treeQueryKey, useMoveMutation, useTreeQuery } from './queries'

function setup() {
  const api = createMockApi()
  vi.spyOn(api, 'moveNode')
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ApiProvider api={api}>{children}</ApiProvider>
    </QueryClientProvider>
  )
  const { result } = renderHook(() => useMoveMutation('sample'), { wrapper })
  return { api, queryClient, result }
}

describe('useMoveMutation', () => {
  it('still reaches the server when the tree is not cached yet', async () => {
    const success = vi.spyOn(toast, 'success')
    const { api, queryClient, result } = setup()

    result.current.mutate({ id: 'welcome-md', target: 'drafts' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.moveNode).toHaveBeenCalledWith('sample', 'welcome-md', 'drafts')
    expect(queryClient.getQueryData(treeQueryKey('sample'))).toBeUndefined()
    expect(success).toHaveBeenCalledWith('Moved “Unknown item” to Unknown item', expect.anything())
  })

  it('refuses a move that breaks a rule before calling the server, and leaves the cache alone', async () => {
    const error = vi.spyOn(toast, 'error')
    const { api, queryClient, result } = setup()
    const tree = normalizeTree(createSampleDataset())
    queryClient.setQueryData(treeQueryKey('sample'), tree)

    result.current.mutate({ id: 'engineering', target: 'engineering/api' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(api.moveNode).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(treeQueryKey('sample'))).toBe(tree)
    expect(error).toHaveBeenCalledWith('Couldn’t move “Engineering”'.replace('’', "'"), {
      description: 'A folder cannot be moved into one of its own subfolders.',
    })
  })
})

describe('useMoveMutation with several moves in flight', () => {
  /** A server whose moves wait until the test settles them, one by one. */
  async function setupConcurrent() {
    const api = createMockApi()
    const pending: { resolve: () => void; reject: (error: Error) => void }[] = []
    api.moveNode = vi.fn(() => new Promise<void>((resolve, reject) => pending.push({ resolve, reject })))
    vi.spyOn(api, 'getTree')
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <ApiProvider api={api}>{children}</ApiProvider>
      </QueryClientProvider>
    )
    const { result } = renderHook(() => ({ tree: useTreeQuery('sample'), move: useMoveMutation('sample') }), {
      wrapper,
    })
    await waitFor(() => expect(result.current.tree.isSuccess).toBe(true))
    vi.mocked(api.getTree).mockClear()
    // Read the cache itself: the hook result only re-renders for the fields a component reads during render.
    const parentOf = (id: string) => queryClient.getQueryData<Tree>(treeQueryKey('sample'))!.nodes[id]!.parentId
    return { api, pending, result, parentOf }
  }

  it('waits for the last move before refetching, so a refetch cannot undo a pending move', async () => {
    const { api, pending, result, parentOf } = await setupConcurrent()
    act(() => result.current.move.mutate({ id: 'welcome-md', target: 'drafts' }))
    act(() => result.current.move.mutate({ id: 'team', target: 'clients' }))
    await waitFor(() => expect(pending).toHaveLength(2))

    await act(async () => pending[0]!.resolve())
    expect(api.getTree).not.toHaveBeenCalled()
    expect(parentOf('team')).toBe('clients')

    await act(async () => pending[1]!.resolve())
    await waitFor(() => expect(api.getTree).toHaveBeenCalledTimes(1))
  })

  it('a failed move reverts only itself, not the moves still in flight', async () => {
    const { api, pending, result, parentOf } = await setupConcurrent()
    act(() => result.current.move.mutate({ id: 'team', target: 'clients' }))
    act(() => result.current.move.mutate({ id: 'welcome-md', target: 'drafts' }))
    await waitFor(() => expect(pending).toHaveLength(2))

    expect(api.moveNode).toHaveBeenNthCalledWith(1, 'sample', 'team', 'clients')

    await act(async () => pending[0]!.reject(new ApiError(403, 'Read-only.')))
    expect(parentOf('team')).toBeNull()
    expect(parentOf('welcome-md')).toBe('drafts')
  })

  it('refetches when a failed move can no longer be reverted on its own', async () => {
    const { api, pending, result, parentOf } = await setupConcurrent()
    act(() => result.current.move.mutate({ id: 'welcome-md', target: 'drafts' }))
    act(() => result.current.move.mutate({ id: 'welcome-md', target: 'team' }))
    await waitFor(() => expect(pending).toHaveLength(2))
    expect(parentOf('welcome-md')).toBe('team')

    // The first move fails, but the item has moved on since: only the server knows the truth.
    await act(async () => pending[0]!.reject(new ApiError(500, 'Server error.')))
    await waitFor(() => expect(api.getTree).toHaveBeenCalledTimes(1))
  })
})

describe('useApi', () => {
  it('explains when it is used outside its provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useApi())).toThrow('useApi must be used inside <ApiProvider>')
  })
})
