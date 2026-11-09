import { createFixtureTree, fixtureResponse, file } from '../test/fixtures'
import {
  compareNodes,
  denormalizeTree,
  getAncestorIds,
  getChildIds,
  getDisplayName,
  getFolderStats,
  getNode,
  getPath,
  isDescendantOf,
  listFolders,
  normalizeTree,
  ROOT_LABEL,
} from './tree'

describe('normalizeTree', () => {
  it('builds a flat lookup with parent links', () => {
    const tree = createFixtureTree()
    expect(Object.keys(tree.nodes)).toHaveLength(7)
    expect(tree.nodes.notes).toMatchObject({ parentId: 'old', name: 'notes.md' })
    expect(tree.nodes.docs).toMatchObject({ parentId: null, type: 'folder' })
  })

  it('sorts folders first, then names naturally', () => {
    const tree = createFixtureTree()
    expect(tree.rootIds).toEqual(['docs', 'empty', 'readme'])
    expect(getChildIds(tree, 'docs')).toEqual(['old', 'r2', 'r10'])
  })

  it('rejects duplicate ids', () => {
    expect(() => normalizeTree({ items: [file('a', 'a.txt'), file('a', 'b.txt')] })).toThrow('Duplicate node id "a"')
  })

  it('round-trips through denormalizeTree', () => {
    const tree = createFixtureTree()
    expect(normalizeTree(denormalizeTree(tree))).toEqual(tree)
    const docs = denormalizeTree(tree).items[0]
    expect(docs).toMatchObject({ id: 'docs', children: [{ id: 'old' }, { id: 'r2' }, { id: 'r10' }] })
    expect(JSON.stringify(denormalizeTree(tree))).not.toContain('parentId')
  })

  it('does not mutate the response', () => {
    const before = JSON.stringify(fixtureResponse)
    normalizeTree(fixtureResponse)
    expect(JSON.stringify(fixtureResponse)).toBe(before)
  })
})

describe('compareNodes', () => {
  it('ignores case and compares numbers by value', () => {
    const tree = createFixtureTree()
    expect(compareNodes(tree.nodes.r2!, tree.nodes.r10!)).toBeLessThan(0)
    expect(compareNodes(tree.nodes.readme!, tree.nodes.empty!)).toBeGreaterThan(0)
  })
})

describe('lookups', () => {
  const tree = createFixtureTree()

  it('getNode and getChildIds', () => {
    expect(getNode(tree, 'r2')?.name).toBe('Report 2.pdf')
    expect(getNode(tree, 'missing')).toBeUndefined()
    expect(getChildIds(tree, null)).toBe(tree.rootIds)
    expect(getChildIds(tree, 'readme')).toEqual([])
    expect(getChildIds(tree, 'missing')).toEqual([])
  })

  it('getAncestorIds goes from the parent up to the root', () => {
    expect(getAncestorIds(tree, 'notes')).toEqual(['old', 'docs'])
    expect(getAncestorIds(tree, 'docs')).toEqual([])
    expect(getAncestorIds(tree, 'missing')).toEqual([])
  })

  it('getPath goes from the root down to the item', () => {
    expect(getPath(tree, 'notes').map((node) => node.id)).toEqual(['docs', 'old', 'notes'])
  })

  it('isDescendantOf', () => {
    expect(isDescendantOf(tree, 'notes', 'docs')).toBe(true)
    expect(isDescendantOf(tree, 'docs', 'docs')).toBe(false)
    expect(isDescendantOf(tree, 'readme', 'docs')).toBe(false)
  })

  it('getFolderStats counts recursively', () => {
    expect(getFolderStats(tree, 'docs')).toEqual({ files: 3, folders: 1, bytes: 5500 })
    expect(getFolderStats(tree, 'empty')).toEqual({ files: 0, folders: 0, bytes: 0 })
    expect(getFolderStats(tree, null)).toEqual({ files: 4, folders: 3, bytes: 6524 })
  })

  it('listFolders returns folders in display order with depth', () => {
    expect(listFolders(tree).map(({ node, depth }) => [node.id, depth])).toEqual([
      ['docs', 0],
      ['old', 1],
      ['empty', 0],
    ])
  })
})

describe('getDisplayName', () => {
  it('names items, the root, and ids the tree does not have', () => {
    const tree = createFixtureTree()
    expect(getDisplayName(tree, 'r2')).toBe('Report 2.pdf')
    expect(getDisplayName(tree, null)).toBe(ROOT_LABEL)
    expect(getDisplayName(tree, 'missing')).toBe('Unknown item')
    expect(getDisplayName(undefined, 'r2')).toBe('Unknown item')
  })
})
