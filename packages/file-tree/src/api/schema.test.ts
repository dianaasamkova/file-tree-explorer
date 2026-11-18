import { createSampleDataset } from '../server/datasets/sample'
import { generateDataset } from '../server/datasets/generate'
import { ApiError } from './contract'
import { parseTreeResponse } from './schema'

describe('parseTreeResponse', () => {
  it('accepts the drives the server sends', () => {
    const sample = createSampleDataset()
    expect(parseTreeResponse(sample)).toEqual(sample)
    expect(parseTreeResponse(generateDataset(2_000)).items.length).toBeGreaterThan(0)
  })

  it.each([
    ['not an object', 'oops', 'format.'],
    ['no items', {}, 'at items.'],
    ['a folder without children', { items: [{ id: 'a', name: 'A', type: 'folder' }] }, 'at items.0'],
    [
      'a negative size deep in the tree',
      {
        items: [
          {
            id: 'a',
            name: 'A',
            type: 'folder',
            children: [
              {
                id: 'b',
                name: 'b.txt',
                type: 'file',
                size: -1,
                mimeType: 'text/plain',
                modifiedAt: '2026-01-01T00:00:00Z',
              },
            ],
          },
        ],
      },
      'at items.0',
    ],
    [
      'a date that is not a date',
      { items: [{ id: 'b', name: 'b.txt', type: 'file', size: 1, mimeType: 'text/plain', modifiedAt: 'yesterday' }] },
      'at items.0',
    ],
  ])('rejects %s with a clear error', (_case, data, message) => {
    const error = (() => {
      try {
        parseTreeResponse(data)
      } catch (caught) {
        return caught
      }
    })()
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 502, message: expect.stringContaining(message) })
  })
})
