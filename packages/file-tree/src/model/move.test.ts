import { createFixtureTree } from '../test/fixtures'
import { canMove, getDropTarget, moveErrorMessages, moveNode } from './move'
import { getChildIds } from './tree'

describe('canMove', () => {
  const tree = createFixtureTree()

  it.each([
    ['missing', 'docs', 'not-found'],
    ['readme', 'missing', 'not-found'],
    ['readme', 'r2', 'not-found'],
    ['readme', null, 'same-parent'],
    ['r2', 'docs', 'same-parent'],
    ['docs', 'docs', 'into-self'],
    ['docs', 'old', 'into-descendant'],
  ] as const)('refuses %s → %s (%s)', (id, target, reason) => {
    expect(canMove(tree, id, target)).toEqual({ ok: false, reason })
  })

  it('refuses a name already used in the destination, ignoring case', () => {
    const conflicting = createFixtureTree()
    conflicting.nodes.notes = { ...conflicting.nodes.notes!, name: 'README.md' }
    expect(canMove(conflicting, 'notes', null)).toEqual({ ok: false, reason: 'name-conflict' })
  })

  it('allows valid moves', () => {
    expect(canMove(tree, 'readme', 'docs')).toEqual({ ok: true })
    expect(canMove(tree, 'old', null)).toEqual({ ok: true })
    expect(canMove(tree, 'docs', 'empty')).toEqual({ ok: true })
  })

  it('has a message for every reason', () => {
    expect(Object.values(moveErrorMessages).every((message) => message.endsWith('.'))).toBe(true)
  })
})

describe('moveNode', () => {
  it('moves into a folder at the sorted position', () => {
    const tree = createFixtureTree()
    const next = moveNode(tree, 'readme', 'docs')
    expect(next.rootIds).toEqual(['docs', 'empty'])
    expect(getChildIds(next, 'docs')).toEqual(['old', 'readme', 'r2', 'r10'])
    expect(next.nodes.readme?.parentId).toBe('docs')
  })

  it('moves a folder to the root, before files', () => {
    const next = moveNode(createFixtureTree(), 'old', null)
    expect(next.rootIds).toEqual(['docs', 'empty', 'old', 'readme'])
    expect(getChildIds(next, 'docs')).toEqual(['r2', 'r10'])
  })

  it('moves between folders', () => {
    const next = moveNode(createFixtureTree(), 'notes', 'docs')
    expect(getChildIds(next, 'docs')).toEqual(['old', 'notes', 'r2', 'r10'])
    expect(getChildIds(next, 'old')).toEqual([])
  })

  it('appends when the item sorts after every sibling', () => {
    expect(getChildIds(moveNode(createFixtureTree(), 'readme', 'old'), 'old')).toEqual(['notes', 'readme'])
  })

  it('does not mutate the original tree', () => {
    const tree = createFixtureTree()
    const snapshot = structuredClone(tree)
    moveNode(tree, 'r2', 'empty')
    expect(tree).toEqual(snapshot)
  })

  it('throws on an invalid move', () => {
    expect(() => moveNode(createFixtureTree(), 'docs', 'old')).toThrow(moveErrorMessages['into-descendant'])
  })
})

describe('getDropTarget', () => {
  const tree = createFixtureTree()
  it('is the folder itself, a file’s folder, or the root', () => {
    expect(getDropTarget(tree, 'old')).toBe('old')
    expect(getDropTarget(tree, 'notes')).toBe('old')
    expect(getDropTarget(tree, 'readme')).toBeNull()
    expect(getDropTarget(tree, 'missing')).toBeNull()
  })
})
