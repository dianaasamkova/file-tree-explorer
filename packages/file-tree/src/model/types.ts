export type NodeId = string

/** A node as the backend sends it: a nested tree. */
export type ApiNode = ApiFolder | ApiFile

export interface ApiFolder {
  id: NodeId
  name: string
  type: 'folder'
  children: ApiNode[]
}

export interface ApiFile {
  id: NodeId
  name: string
  type: 'file'
  /** Size in bytes. */
  size: number
  mimeType: string
  /** ISO 8601 date-time. */
  modifiedAt: string
}

export interface ApiTreeResponse {
  items: ApiNode[]
}

/** A node in the client-side normalized tree: flat lookup by id, children referenced by id. */
export type TreeNode = FolderNode | FileNode

export interface FolderNode {
  id: NodeId
  name: string
  type: 'folder'
  parentId: NodeId | null
  childIds: NodeId[]
}

export interface FileNode extends Omit<ApiFile, 'type'> {
  type: 'file'
  parentId: NodeId | null
}

/**
 * Normalized tree. Lookups and moves are O(1) on `nodes`, and the root has no node of its own:
 * its children live in `rootIds`. Children are always kept sorted (folders first, then by name).
 */
export interface Tree {
  rootIds: NodeId[]
  nodes: Record<NodeId, TreeNode>
}

/** `null` means the root of the tree. */
export type FolderTarget = NodeId | null
