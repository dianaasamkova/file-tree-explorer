import { moveErrorMessages, canMove, moveNode } from '../model/move'
import { denormalizeTree, getAncestorIds, normalizeTree } from '../model/tree'
import type { ApiTreeResponse, FolderTarget, NodeId, Tree } from '../model/types'
import { generateDataset } from './datasets/generate'
import { createSampleDataset, SAMPLE_LOCKED_FOLDER_ID } from './datasets/sample'

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

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** The contract the UI depends on. A real backend client would implement the same interface. */
export interface FileTreeApi {
  getTree(dataset: DatasetId, signal?: AbortSignal): Promise<ApiTreeResponse>
  moveNode(dataset: DatasetId, id: NodeId, target: FolderTarget): Promise<void>
}

export interface MockApiOptions {
  /** Simulated network latency in ms. Use 0 in tests. */
  latency?: number
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(signal.reason)
    })
  })
}

const factories: Record<DatasetId, () => ApiTreeResponse> = {
  sample: createSampleDataset,
  large: () => generateDataset(10_000),
}

const lockedFolders: Record<DatasetId, NodeId[]> = {
  sample: [SAMPLE_LOCKED_FOLDER_ID],
  large: [],
}

/**
 * An in-memory backend. It keeps its own copy of each drive and re-checks every rule on move,
 * as a real server must: the client's checks are only for fast feedback. It also enforces one
 * rule the client does not know about (read-only folders), which is how a failed optimistic
 * update can be seen in the demo.
 */
export function createMockApi({ latency = 0 }: MockApiOptions = {}): FileTreeApi {
  const store = new Map<DatasetId, Tree>()

  const load = (dataset: DatasetId) => {
    let tree = store.get(dataset)
    if (!tree) {
      tree = normalizeTree(factories[dataset]())
      store.set(dataset, tree)
    }
    return tree
  }

  const lockedFolderOf = (dataset: DatasetId, tree: Tree, id: NodeId | null) => {
    if (id === null) return undefined
    const chain = [id, ...getAncestorIds(tree, id)]
    return lockedFolders[dataset].find((lockedId) => chain.includes(lockedId))
  }

  return {
    async getTree(dataset, signal) {
      await delay(latency, signal)
      return denormalizeTree(load(dataset))
    },

    async moveNode(dataset, id, target) {
      await delay(latency * 1.5)
      const tree = load(dataset)
      const check = canMove(tree, id, target)
      if (!check.ok) {
        throw new ApiError(check.reason === 'not-found' ? 404 : 409, moveErrorMessages[check.reason])
      }
      const locked = lockedFolderOf(dataset, tree, id) ?? lockedFolderOf(dataset, tree, target)
      if (locked) {
        throw new ApiError(403, `“${tree.nodes[locked]!.name}” is read-only. Items can't be moved into or out of it.`)
      }
      store.set(dataset, moveNode(tree, id, target))
    },
  }
}
