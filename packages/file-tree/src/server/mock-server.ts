import { canMove, moveErrorMessages, moveNode } from '../model/move'
import { denormalizeTree, getAncestorIds, normalizeTree } from '../model/tree'
import { ApiError, type DatasetId, type FileTreeApi } from '../api/contract'
import type { ApiTreeResponse, NodeId, Tree } from '../model/types'
import { generateDataset } from './datasets/generate'
import { createSampleDataset, SAMPLE_LOCKED_FOLDER_ID } from './datasets/sample'

export interface MockApiOptions {
  /** Simulated network latency in ms. Use 0 in tests. */
  latency?: number
}

/** Reads `?latency=` from the URL: a number of ms, or the default when missing or invalid. */
export function parseLatency(value: string | null, fallback = 400): number {
  const latency = value === null || value.trim() === '' ? NaN : Number(value)
  return Number.isFinite(latency) && latency >= 0 ? latency : fallback
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
 * An in-memory backend that implements the API contract. It keeps its own copy of each drive and re-checks every rule on move,
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
