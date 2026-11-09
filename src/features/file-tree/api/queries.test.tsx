import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { normalizeTree } from '../model/tree'
import { ApiProvider, useApi } from './api-context'
import { createSampleDataset } from './datasets/sample'
import { createMockApi } from './mock-api'
import { treeQueryKey, useMoveMutation } from './queries'

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

describe('useApi', () => {
  it('explains when it is used outside its provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useApi())).toThrow('useApi must be used inside <ApiProvider>')
  })
})
