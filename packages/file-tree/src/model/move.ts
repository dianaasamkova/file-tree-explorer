import { compareNodes, getChildIds, isDescendantOf } from './tree'
import type { FolderNode, FolderTarget, NodeId, Tree } from './types'

export type MoveError = 'not-found' | 'same-parent' | 'into-self' | 'into-descendant' | 'name-conflict'

export type MoveCheck = { ok: true } | { ok: false; reason: MoveError }

export const moveErrorMessages: Record<MoveError, string> = {
  'not-found': 'The item or the destination no longer exists.',
  'same-parent': 'It is already in this folder.',
  'into-self': 'A folder cannot be moved into itself.',
  'into-descendant': 'A folder cannot be moved into one of its own subfolders.',
  'name-conflict': 'The destination already has an item with this name.',
}

/** Where an item lands when dropped or pasted onto `id`: the folder itself, or a file's folder. */
export function getDropTarget(tree: Tree, id: NodeId): FolderTarget {
  const node = tree.nodes[id]
  if (!node) return null
  return node.type === 'folder' ? node.id : node.parentId
}

/** Business rules for moving `id` into `target` (a folder id, or `null` for the root). */
export function canMove(tree: Tree, id: NodeId, target: FolderTarget): MoveCheck {
  const node = tree.nodes[id]
  if (!node) return { ok: false, reason: 'not-found' }
  if (target !== null && tree.nodes[target]?.type !== 'folder') return { ok: false, reason: 'not-found' }
  if (node.parentId === target) return { ok: false, reason: 'same-parent' }
  if (target === id) return { ok: false, reason: 'into-self' }
  if (target !== null && isDescendantOf(tree, target, id)) return { ok: false, reason: 'into-descendant' }

  const name = node.name.toLocaleLowerCase()
  const siblings = getChildIds(tree, target)
  if (siblings.some((siblingId) => tree.nodes[siblingId]!.name.toLocaleLowerCase() === name)) {
    return { ok: false, reason: 'name-conflict' }
  }
  return { ok: true }
}

/** Returns a new tree with `id` moved into `target`; throws if the move breaks a rule. */
export function moveNode(tree: Tree, id: NodeId, target: FolderTarget): Tree {
  const check = canMove(tree, id, target)
  if (!check.ok) throw new Error(moveErrorMessages[check.reason])

  const node = tree.nodes[id]!
  const nodes = { ...tree.nodes, [id]: { ...node, parentId: target } }
  let rootIds = tree.rootIds

  // Detach from the old parent.
  if (node.parentId === null) {
    rootIds = rootIds.filter((childId) => childId !== id)
  } else {
    // A parent is always a folder (normalizeTree builds it so), and canMove checked the target.
    const oldParent = nodes[node.parentId] as FolderNode
    nodes[oldParent.id] = { ...oldParent, childIds: oldParent.childIds.filter((childId) => childId !== id) }
  }

  // Attach to the new parent at its sorted position.
  const insertSorted = (ids: NodeId[]) => {
    const index = ids.findIndex((childId) => compareNodes(nodes[id]!, nodes[childId]!) < 0)
    return index === -1 ? [...ids, id] : [...ids.slice(0, index), id, ...ids.slice(index)]
  }
  if (target === null) {
    rootIds = insertSorted(rootIds)
  } else {
    const newParent = nodes[target] as FolderNode
    nodes[target] = { ...newParent, childIds: insertSorted(newParent.childIds) }
  }

  return { rootIds, nodes }
}
