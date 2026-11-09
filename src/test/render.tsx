import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '@/app'
import { ApiProvider } from '@/features/file-tree/api/api-context'
import { createMockApi, type FileTreeApi } from '@/features/file-tree/api/mock-api'

/** Renders the whole app against a fresh in-memory backend with no latency. */
export function renderApp({ url = '/', api = createMockApi() }: { url?: string; api?: FileTreeApi } = {}) {
  window.history.replaceState(null, '', url)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const user = userEvent.setup()
  const result = render(
    <QueryClientProvider client={queryClient}>
      <ApiProvider api={api}>
        <App />
      </ApiProvider>
    </QueryClientProvider>,
  )
  return { ...result, user, api, queryClient }
}

/** A tree item by the start of its accessible name (names also include the size, e.g. "Logo.svg 18 KB"). */
export const getItem = (name: string) => screen.getByRole('treeitem', { name: new RegExp(`^${escape(name)}`) })
export const queryItem = (name: string) => screen.queryByRole('treeitem', { name: new RegExp(`^${escape(name)}`) })
export const findItem = (name: string) => screen.findByRole('treeitem', { name: new RegExp(`^${escape(name)}`) })

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** The item the tree's `aria-activedescendant` points at: the keyboard focus. */
export function getActiveItem() {
  const id = screen.getByRole('tree').getAttribute('aria-activedescendant')
  return id ? document.getElementById(id) : null
}

export const getDetails = () => within(screen.getByRole('complementary', { name: 'Details' }))

export const searchParam = (key: string) => new URLSearchParams(window.location.search).get(key)
