import type { ApiNode, ApiTreeResponse, FolderNode, FolderTarget, NodeId, Tree, TreeNode } from './types'

const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })

/** Folders first, then natural name order ("file2" before "file10"). */
export function compareNodes(a: TreeNode, b: TreeNode): number {
  if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
  return collator.compare(a.name, b.name)
}

function sortIds(ids: NodeId[], nodes: Tree['nodes']): NodeId[] {
  return ids.toSorted((a, b) => compareNodes(nodes[a]!, nodes[b]!))
}

/** Turns the backend's nested response into a normalized, sorted tree. */
export function normalizeTree(response: ApiTreeResponse): Tree {
  const nodes: Tree['nodes'] = {}

  function visit(item: ApiNode, parentId: NodeId | null): NodeId {
    if (nodes[item.id]) throw new Error(`Duplicate node id "${item.id}"`)
    if (item.type === 'folder') {
      const folder: FolderNode = { id: item.id, name: item.name, type: 'folder', parentId, childIds: [] }
      nodes[item.id] = folder
      folder.childIds = item.children.map((child) => visit(child, item.id))
    } else {
      nodes[item.id] = { ...item, parentId }
    }
    return item.id
  }

  const rootIds = response.items.map((item) => visit(item, null))
  for (const node of Object.values(nodes)) {
    if (node.type === 'folder') node.childIds = sortIds(node.childIds, nodes)
  }
  return { rootIds: sortIds(rootIds, nodes), nodes }
}

/** What the UI calls the root of the drive. */
export const ROOT_LABEL = 'Drive'

/** A name to show for an item or the root, with a fallback for an id the tree doesn't have (yet). */
export function getDisplayName(tree: Tree | undefined, id: FolderTarget): string {
  if (id === null) return ROOT_LABEL
  return tree?.nodes[id]?.name ?? 'Unknown item'
}

/** The reverse of `normalizeTree`: what the backend stores and sends. */
export function denormalizeTree(tree: Tree): ApiTreeResponse {
  function toApi(id: NodeId): ApiNode {
    const node = tree.nodes[id]!
    if (node.type === 'folder') {
      return { id: node.id, name: node.name, type: 'folder', children: node.childIds.map(toApi) }
    }
    const { parentId, ...file } = node
    return file
  }
  return { items: tree.rootIds.map(toApi) }
}

export function getNode(tree: Tree, id: NodeId): TreeNode | undefined {
  return tree.nodes[id]
}

export function getChildIds(tree: Tree, parent: FolderTarget): NodeId[] {
  if (parent === null) return tree.rootIds
  const node = tree.nodes[parent]
  return node?.type === 'folder' ? node.childIds : []
}

/** Ancestor ids from the closest parent up to a root item. */
export function getAncestorIds(tree: Tree, id: NodeId): NodeId[] {
  const ancestors: NodeId[] = []
  let current = tree.nodes[id]?.parentId ?? null
  while (current !== null) {
    ancestors.push(current)
    current = tree.nodes[current]?.parentId ?? null
  }
  return ancestors
}

/** Nodes from the root item down to `id` itself. */
export function getPath(tree: Tree, id: NodeId): TreeNode[] {
  return [id, ...getAncestorIds(tree, id)].reverse().map((nodeId) => tree.nodes[nodeId]!)
}

export function isDescendantOf(tree: Tree, id: NodeId, ancestorId: NodeId): boolean {
  return getAncestorIds(tree, id).includes(ancestorId)
}

export interface FolderStats {
  files: number
  folders: number
  bytes: number
}

/** Recursive totals for a folder, or for the whole tree when `id` is `null`. */
export function getFolderStats(tree: Tree, id: FolderTarget): FolderStats {
  const stats: FolderStats = { files: 0, folders: 0, bytes: 0 }
  const stack = [...getChildIds(tree, id)]
  while (stack.length > 0) {
    const node = tree.nodes[stack.pop()!]!
    if (node.type === 'folder') {
      stats.folders += 1
      stack.push(...node.childIds)
    } else {
      stats.files += 1
      stats.bytes += node.size
    }
  }
  return stats
}

/** All folders in display order with their depth; used for the "Move to" picker. */
export function listFolders(tree: Tree): { node: FolderNode; depth: number }[] {
  const result: { node: FolderNode; depth: number }[] = []
  function walk(ids: NodeId[], depth: number) {
    for (const id of ids) {
      const node = tree.nodes[id]!
      if (node.type !== 'folder') continue
      result.push({ node, depth })
      walk(node.childIds, depth + 1)
    }
  }
  walk(tree.rootIds, 0)
  return result
}
