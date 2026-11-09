import { getAncestorIds } from './tree'
import type { NodeId, Tree, TreeNode } from './types'

export interface SearchResult {
  query: string
  /** Items whose name contains the query. */
  matchIds: Set<NodeId>
  /** Everything that stays visible: matches, their ancestors, and the content of matching folders. */
  visibleIds: Set<NodeId>
  /** Ancestors of matches: opened automatically so no match is hidden in a collapsed folder. */
  autoExpandedIds: Set<NodeId>
}

/** Case-insensitive name search. Returns `null` for an empty query (no filtering). */
export function searchTree(tree: Tree, rawQuery: string): SearchResult | null {
  const query = rawQuery.trim().toLocaleLowerCase()
  if (!query) return null

  const matchIds = new Set<NodeId>()
  const visibleIds = new Set<NodeId>()
  const autoExpandedIds = new Set<NodeId>()

  for (const node of Object.values(tree.nodes)) {
    if (!node.name.toLocaleLowerCase().includes(query)) continue
    matchIds.add(node.id)
    visibleIds.add(node.id)
    for (const ancestorId of getAncestorIds(tree, node.id)) {
      // Ancestors were already added by an earlier match that shares them.
      if (autoExpandedIds.has(ancestorId)) break
      autoExpandedIds.add(ancestorId)
      visibleIds.add(ancestorId)
    }
  }

  // A matching folder keeps all of its content: the user searched for the folder itself.
  for (const id of matchIds) {
    const stack = [id]
    while (stack.length > 0) {
      const node = tree.nodes[stack.pop()!]!
      if (node.type !== 'folder') continue
      for (const childId of node.childIds) {
        visibleIds.add(childId)
        stack.push(childId)
      }
    }
  }

  return { query, matchIds, visibleIds, autoExpandedIds }
}

export interface VisibleRow {
  id: NodeId
  node: TreeNode
  /** 1-based, as `aria-level` expects. */
  level: number
  /** 1-based position among visible siblings, for `aria-posinset`. */
  posInSet: number
  setSize: number
  isExpanded: boolean
}

/**
 * Flattens the tree into the rows currently on screen, in display order. A flat list lets the
 * tree be virtualized: only the rows in the viewport are rendered.
 */
export function getVisibleRows(
  tree: Tree,
  expandedIds: ReadonlySet<NodeId>,
  filter?: ReadonlySet<NodeId>,
): VisibleRow[] {
  const rows: VisibleRow[] = []

  function walk(ids: NodeId[], level: number) {
    const shown = filter ? ids.filter((id) => filter.has(id)) : ids
    shown.forEach((id, index) => {
      const node = tree.nodes[id]!
      const isExpanded = node.type === 'folder' && expandedIds.has(id)
      rows.push({ id, node, level, posInSet: index + 1, setSize: shown.length, isExpanded })
      if (isExpanded) walk(node.childIds, level + 1)
    })
  }

  walk(tree.rootIds, 1)
  return rows
}
