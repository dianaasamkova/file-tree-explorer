import { createFixtureTree } from '@/test/fixtures'
import { getVisibleRows, searchTree } from './visible'

describe('searchTree', () => {
  const tree = createFixtureTree()

  it('returns null for an empty or blank query', () => {
    expect(searchTree(tree, '')).toBeNull()
    expect(searchTree(tree, '   ')).toBeNull()
  })

  it('matches names case-insensitively and keeps the path to each match', () => {
    const result = searchTree(tree, ' NOTES ')!
    expect(result.query).toBe('notes')
    expect([...result.matchIds]).toEqual(['notes'])
    expect(result.visibleIds).toEqual(new Set(['notes', 'old', 'docs']))
    expect(result.autoExpandedIds).toEqual(new Set(['old', 'docs']))
  })

  it('keeps all the content of a matching folder', () => {
    const result = searchTree(tree, 'docs')!
    expect(result.matchIds).toEqual(new Set(['docs']))
    expect(result.visibleIds).toEqual(new Set(['docs', 'r2', 'r10', 'old', 'notes']))
    expect(result.autoExpandedIds.size).toBe(0)
  })

  it('shares ancestors between matches', () => {
    const result = searchTree(tree, 'report')!
    expect(result.matchIds).toEqual(new Set(['r2', 'r10']))
    expect(result.autoExpandedIds).toEqual(new Set(['docs']))
  })

  it('finds nothing', () => {
    expect(searchTree(tree, 'zzz')!.visibleIds.size).toBe(0)
  })
})

describe('getVisibleRows', () => {
  const tree = createFixtureTree()

  it('shows only root items when nothing is expanded', () => {
    const rows = getVisibleRows(tree, new Set())
    expect(rows.map((row) => row.id)).toEqual(['docs', 'empty', 'readme'])
    expect(rows[2]).toMatchObject({ level: 1, posInSet: 3, setSize: 3, isExpanded: false })
  })

  it('walks into expanded folders in display order with ARIA metadata', () => {
    const rows = getVisibleRows(tree, new Set(['docs', 'old']))
    expect(rows.map((row) => `${row.id}@${row.level}`)).toEqual([
      'docs@1',
      'old@2',
      'notes@3',
      'r2@2',
      'r10@2',
      'empty@1',
      'readme@1',
    ])
    expect(rows[0]!.isExpanded).toBe(true)
    expect(rows[3]).toMatchObject({ posInSet: 2, setSize: 3 })
  })

  it('applies a filter, so set sizes count only visible siblings', () => {
    const search = searchTree(tree, 'report')!
    const rows = getVisibleRows(tree, search.autoExpandedIds, search.visibleIds)
    expect(rows.map((row) => row.id)).toEqual(['docs', 'r2', 'r10'])
    expect(rows[1]).toMatchObject({ posInSet: 1, setSize: 2 })
  })

  it('never marks a file as expanded', () => {
    expect(getVisibleRows(tree, new Set(['readme']))[2]!.isExpanded).toBe(false)
  })
})
