import type { FolderTarget, NodeId } from '../model/types'

/**
 * The contract between the UI and the backend. The UI depends only on this file; the in-browser
 * mock server in `server/` is one implementation, and a real HTTP client would be another.
 */

export type DatasetId = 'sample' | 'large'

export const datasets: Record<DatasetId, { label: string; description: string }> = {
  sample: { label: 'Sample drive', description: 'A small team drive' },
  large: { label: '10,000 items', description: 'A generated drive for performance' },
}

export function isDatasetId(value: unknown): value is DatasetId {
  return value === 'sample' || value === 'large'
}

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ApiError'
    this.status = status
  }
}

/** The contract the UI depends on. A real backend client would implement the same interface. */
export interface FileTreeApi {
  /** The drive as nested JSON. Its shape isn't trusted: the client validates it (see schema.ts). */
  getTree(dataset: DatasetId, signal?: AbortSignal): Promise<unknown>
  moveNode(dataset: DatasetId, id: NodeId, target: FolderTarget): Promise<void>
}
