import { normalizeTree } from '../model/tree'
import type { ApiNode } from '../model/types'
import { createRandom, generateDataset } from './datasets/generate'
import { createSampleDataset, SAMPLE_LOCKED_FOLDER_ID } from './datasets/sample'
import { ApiError, createMockApi, isDatasetId } from './mock-api'

const countItems = (items: ApiNode[]): number =>
  items.reduce((sum, item) => sum + 1 + (item.type === 'folder' ? countItems(item.children) : 0), 0)

describe('datasets', () => {
  it('the sample drive is valid and has stable, path-based ids', () => {
    const tree = normalizeTree(createSampleDataset())
    expect(Object.keys(tree.nodes)).toHaveLength(47)
    expect(tree.nodes['finance/invoices/invoice-2026-09-pdf']?.name).toBe('Invoice 2026-09.pdf')
    expect(tree.nodes[SAMPLE_LOCKED_FOLDER_ID]?.type).toBe('folder')
  })

  it('the generator is deterministic and makes exactly the requested number of items', () => {
    const first = generateDataset(2_000, 7)
    expect(countItems(first.items)).toBe(2_000)
    expect(generateDataset(2_000, 7)).toEqual(first)
    expect(generateDataset(2_000, 8)).not.toEqual(first)
  })

  it('the generator never repeats a name inside a folder', () => {
    const tree = normalizeTree(generateDataset(10_000))
    for (const node of Object.values(tree.nodes)) {
      if (node.type !== 'folder') continue
      const names = node.childIds.map((id) => tree.nodes[id]!.name.toLowerCase())
      expect(new Set(names).size).toBe(names.length)
    }
  })

  it('createRandom gives numbers in range', () => {
    const random = createRandom(1)
    for (let index = 0; index < 100; index += 1) {
      const value = random.int(3, 5)
      expect(value).toBeGreaterThanOrEqual(3)
      expect(value).toBeLessThanOrEqual(5)
    }
  })

  it('isDatasetId', () => {
    expect(isDatasetId('sample')).toBe(true)
    expect(isDatasetId('large')).toBe(true)
    expect(isDatasetId('other')).toBe(false)
    expect(isDatasetId(null)).toBe(false)
  })
})

describe('createMockApi', () => {
  it('returns a fresh copy of the tree each time', async () => {
    const api = createMockApi()
    const first = await api.getTree('sample')
    first.items.length = 0
    expect((await api.getTree('sample')).items.length).toBeGreaterThan(0)
  })

  it('persists moves', async () => {
    const api = createMockApi()
    await api.moveNode('sample', 'welcome-md', 'drafts')
    const tree = normalizeTree(await api.getTree('sample'))
    expect(tree.nodes['welcome-md']?.parentId).toBe('drafts')
  })

  it.each([
    ['missing', 'drafts', 404, 'no longer exists'],
    ['engineering', 'engineering/api', 409, 'own subfolders'],
    ['team', SAMPLE_LOCKED_FOLDER_ID, 403, 'read-only'],
    [`${SAMPLE_LOCKED_FOLDER_ID}/old-website-zip`, null, 403, 'read-only'],
  ])('rejects %s → %s with %d', async (id, target, status, message) => {
    const api = createMockApi()
    const error = await api.moveNode('sample', id, target).catch((reason: unknown) => reason)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status, message: expect.stringContaining(message) })
  })

  it('waits for the latency and can be aborted', async () => {
    vi.useFakeTimers()
    const api = createMockApi({ latency: 400 })
    const done = vi.fn()
    void api.getTree('sample').then(done)
    await vi.advanceTimersByTimeAsync(399)
    expect(done).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(done).toHaveBeenCalled()

    const controller = new AbortController()
    const aborted = api.getTree('large', controller.signal)
    controller.abort(new Error('aborted'))
    await expect(aborted).rejects.toThrow('aborted')
  })
})
