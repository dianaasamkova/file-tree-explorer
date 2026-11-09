import { normalizeTree } from '@/features/file-tree/model/tree'
import type { ApiFile, ApiTreeResponse } from '@/features/file-tree/model/types'

export const file = (id: string, name: string, overrides: Partial<ApiFile> = {}): ApiFile => ({
  id,
  name,
  type: 'file',
  size: 1024,
  mimeType: 'text/plain',
  modifiedAt: '2026-01-01T00:00:00Z',
  ...overrides,
})

/**
 * docs/                 (folder)
 *   Report 10.pdf
 *   Report 2.pdf
 *   old/                (folder)
 *     notes.md
 * empty/                (folder)
 * readme.md
 *
 * Given in a scrambled order, to check that normalizing sorts it.
 */
export const fixtureResponse: ApiTreeResponse = {
  items: [
    file('readme', 'readme.md'),
    {
      id: 'docs',
      name: 'Docs',
      type: 'folder',
      children: [
        file('r10', 'Report 10.pdf', { size: 3000, mimeType: 'application/pdf' }),
        { id: 'old', name: 'Old', type: 'folder', children: [file('notes', 'notes.md', { size: 500 })] },
        file('r2', 'Report 2.pdf', { size: 2000, mimeType: 'application/pdf' }),
      ],
    },
    { id: 'empty', name: 'Empty', type: 'folder', children: [] },
  ],
}

export const createFixtureTree = () => normalizeTree(fixtureResponse)
