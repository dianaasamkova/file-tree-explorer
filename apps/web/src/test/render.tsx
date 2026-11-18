import { renderWithProviders } from '@fte/file-tree/testing'
import type { FileTreeApi } from '@fte/file-tree'
import { App } from '../app'

export { findItem, getItem, searchParam } from '@fte/file-tree/testing'

/** Renders the whole app against a fresh in-memory backend with no latency. */
export function renderApp(options: { url?: string; api?: FileTreeApi } = {}) {
  return renderWithProviders(<App />, options)
}
