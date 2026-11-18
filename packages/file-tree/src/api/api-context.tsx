import { createContext, use, type ReactNode } from 'react'
import type { FileTreeApi } from './contract'

const ApiContext = createContext<FileTreeApi | null>(null)

/** Injects the backend client, so tests and the demo can use different ones. */
export function ApiProvider({ api, children }: { api: FileTreeApi; children: ReactNode }) {
  return <ApiContext value={api}>{children}</ApiContext>
}

export function useApi(): FileTreeApi {
  const api = use(ApiContext)
  if (!api) throw new Error('useApi must be used inside <ApiProvider>')
  return api
}
