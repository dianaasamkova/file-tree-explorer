import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app'
import { ApiProvider, createMockApi, parseDemoOptions } from '@fte/file-tree'
import './index.css'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } })
// Latency is real enough to see loading states and optimistic updates; `?latency=0` turns it off,
// and `?corrupt` makes the mock server send a malformed drive to show the error handling.
const demoOptions = parseDemoOptions(window.location.search)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ApiProvider api={createMockApi(demoOptions)}>
        <App />
      </ApiProvider>
    </QueryClientProvider>
  </StrictMode>,
)
