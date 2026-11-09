import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app'
import { ApiProvider } from './features/file-tree/api/api-context'
import { createMockApi, parseLatency } from './features/file-tree/api/mock-api'
import './index.css'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } })
// Latency is real enough to see loading states and optimistic updates; `?latency=0` turns it off.
const latency = parseLatency(new URLSearchParams(window.location.search).get('latency'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ApiProvider api={createMockApi({ latency })}>
        <App />
      </ApiProvider>
    </QueryClientProvider>
  </StrictMode>,
)
