/**
 * Property-based tests: instead of a few hand-written trees, fast-check generates hundreds of
 * random drives and random sequences of moves, and checks the rules that must hold for all of
 * them. When a rule breaks, fast-check shrinks the input to the smallest tree that still fails
 * and prints a seed to replay it.
 */
import fc from 'fast-check'
import { canMove, moveNode } from './move'
import { compareNodes, denormalizeTree, getAncestorIds, getChildIds, normalizeTree } from './tree'
import type { ApiFile, ApiFolder, ApiNode, ApiTreeResponse, NodeId, Tree } from './types'
import { getVisibleRows, searchTree } from './visible'

// ---- Generators ----------------------------------------------------------------------------

const name = fc.stringMatching(/^[A-Za-z][a-z]{0,5}( [0-9]{1,2})?$/)
const byName = (node: { name: string }) => node.name.toLowerCase()

/** A node before ids are assigned. */
type Draft = Omit<ApiFile, 'id'> | (Omit<ApiFolder, 'id' | 'children'> & { children: Draft[] })

/** A drive as the server sends it: nested folders and files, with unique names in each folder. */
const drive: fc.Arbitrary<ApiTreeResponse> = (() => {
  const { node } = fc.letrec<{ node: Draft; folder: Draft }>((tie) => ({
    node: fc.oneof(
      { depthSize: 'small', withCrossShrink: true },
      fc.record({
        name,
        type: fc.constant('file' as const),
        size: fc.nat({ max: 2 ** 32 }),
        mimeType: fc.constantFrom('application/pdf', 'image/png', 'text/markdown'),
        modifiedAt: fc
          .date({ min: new Date('2020-01-01'), max: new Date('2026-12-31'), noInvalidDate: true })
          .map((date) => date.toISOString()),
      }),
      tie('folder'),
    ),
    folder: fc.record({
      name,
      type: fc.constant('folder' as const),
      children: fc.uniqueArray(tie('node'), { selector: byName, maxLength: 5 }),
    }),
  }))
  return fc.uniqueArray(node, { selector: byName, maxLength: 6 }).map((items) => {
    // Ids are assigned afterwards, so they are unique however the tree was shrunk.
    let next = 0
    const withIds = (item: Draft): ApiNode => {
      const id = `n${next++}`
      return item.type === 'folder' ? { ...item, id, children: item.children.map(withIds) } : { ...item, id }
    }
    return { items: items.map(withIds) }
  })
})()

/** A sequence of move attempts, as picks among the drive's items (index 0 of the targets is the root). */
const moves = fc.array(fc.tuple(fc.nat(), fc.nat()), { maxLength: 15 })

// ---- Invariants ----------------------------------------------------------------------------

/** Everything a valid normalized tree promises, checked from scratch. */
function expectValidTree(tree: Tree, expectedIds: ReadonlySet<NodeId>) {
  const ids = Object.keys(tree.nodes)
  // Nothing lost, nothing added.
  expect(new Set(ids)).toEqual(expectedIds)

  // Every node is listed exactly once, by the parent its parentId names.
  const listed = [
    tree.rootIds,
    ...Object.values(tree.nodes).map((node) => (node.type === 'folder' ? node.childIds : [])),
  ]
  const all = listed.flat()
  expect(all).toHaveLength(ids.length)
  expect(new Set(all).size).toBe(ids.length)
  for (const node of Object.values(tree.nodes)) {
    expect(getChildIds(tree, node.parentId)).toContain(node.id)
  }

  // No cycles: every node reaches the root within as many steps as there are nodes.
  for (const id of ids) expect(getAncestorIds(tree, id).length).toBeLessThan(ids.length)

  // Children stay sorted: folders first, then names in natural order.
  for (const list of listed) {
    for (let index = 1; index < list.length; index += 1) {
      expect(compareNodes(tree.nodes[list[index - 1]!]!, tree.nodes[list[index]!]!)).toBeLessThanOrEqual(0)
    }
  }
}

// ---- Properties ----------------------------------------------------------------------------

describe('tree model properties', () => {
  it('normalizing gives a valid tree, and denormalizing gives the same tree back', () => {
    fc.assert(
      fc.property(drive, (response) => {
        const tree = normalizeTree(response)
        expectValidTree(tree, new Set(Object.keys(tree.nodes)))
        expect(normalizeTree(denormalizeTree(tree))).toEqual(tree)
      }),
    )
  })

  it('any sequence of moves keeps the tree valid, and canMove predicts exactly which moves succeed', () => {
    fc.assert(
      fc.property(drive, moves, (response, attempts) => {
        let tree = normalizeTree(response)
        const ids = Object.keys(tree.nodes)
        const expectedIds = new Set(ids)
        fc.pre(ids.length > 0)

        for (const [pickItem, pickTarget] of attempts) {
          const id = ids[pickItem % ids.length]!
          const targetIndex = pickTarget % (ids.length + 1)
          const target = targetIndex === 0 ? null : ids[targetIndex - 1]!

          if (canMove(tree, id, target).ok) {
            tree = moveNode(tree, id, target)
            expect(tree.nodes[id]!.parentId).toBe(target)
          } else {
            expect(() => moveNode(tree, id, target)).toThrow()
          }
          expectValidTree(tree, expectedIds)
        }
      }),
    )
  })

  it('a move followed by moving the item back gives back an equal tree', () => {
    fc.assert(
      fc.property(drive, fc.nat(), fc.nat(), (response, pickItem, pickTarget) => {
        const tree = normalizeTree(response)
        const ids = Object.keys(tree.nodes)
        fc.pre(ids.length > 0)
        const id = ids[pickItem % ids.length]!
        const targetIndex = pickTarget % (ids.length + 1)
        const target = targetIndex === 0 ? null : ids[targetIndex - 1]!
        fc.pre(canMove(tree, id, target).ok)

        const moved = moveNode(tree, id, target)
        const from = tree.nodes[id]!.parentId
        expect(canMove(moved, id, from).ok).toBe(true)
        expect(moveNode(moved, id, from)).toEqual(tree)
      }),
    )
  })

  it('search shows every match together with all the folders above it', () => {
    fc.assert(
      fc.property(drive, fc.nat(), fc.nat({ max: 3 }), (response, pick, length) => {
        const tree = normalizeTree(response)
        const nodes = Object.values(tree.nodes)
        fc.pre(nodes.length > 0)
        // Search for part of a real name, so most runs have matches.
        const source = nodes[pick % nodes.length]!.name
        const query = source.slice(0, length + 1)
        const result = searchTree(tree, query)!

        expect(result.matchIds.size).toBeGreaterThan(0)
        for (const id of result.matchIds) {
          expect(tree.nodes[id]!.name.toLowerCase()).toContain(query.trim().toLowerCase())
          for (const ancestor of getAncestorIds(tree, id)) expect(result.visibleIds).toContain(ancestor)
        }

        // With every folder open, the visible rows are exactly the visible set.
        const folders = new Set(nodes.filter((node) => node.type === 'folder').map((node) => node.id))
        const rows = getVisibleRows(tree, folders, result.visibleIds)
        expect(new Set(rows.map((row) => row.id))).toEqual(result.visibleIds)
      }),
    )
  })

  it('with every folder open and no search, every item is a row exactly once', () => {
    fc.assert(
      fc.property(drive, (response) => {
        const tree = normalizeTree(response)
        const folders = new Set(Object.keys(tree.nodes).filter((id) => tree.nodes[id]!.type === 'folder'))
        const rows = getVisibleRows(tree, folders)
        expect(rows.map((row) => row.id).toSorted()).toEqual(Object.keys(tree.nodes).toSorted())
        for (const row of rows) expect(row.level).toBe(getAncestorIds(tree, row.id).length + 1)
      }),
    )
  })
})
