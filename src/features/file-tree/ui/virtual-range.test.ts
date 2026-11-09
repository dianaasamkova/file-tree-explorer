import { withPinnedIndexes } from './virtual-range'

describe('withPinnedIndexes', () => {
  const range = { startIndex: 10, endIndex: 14, overscan: 2, count: 100 }

  it('renders the visible range with its overscan', () => {
    expect(withPinnedIndexes(range, [])).toEqual([8, 9, 10, 11, 12, 13, 14, 15, 16])
  })

  it('adds pinned rows outside the range, in order and without duplicates', () => {
    expect(withPinnedIndexes(range, [90, 3, 12, undefined])).toEqual([3, 8, 9, 10, 11, 12, 13, 14, 15, 16, 90])
  })

  it('ignores indexes that are not rows', () => {
    expect(withPinnedIndexes(range, [-1, 100])).toEqual([8, 9, 10, 11, 12, 13, 14, 15, 16])
  })
})
