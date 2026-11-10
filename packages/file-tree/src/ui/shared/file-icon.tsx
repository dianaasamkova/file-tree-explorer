import {
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Folder,
  FolderOpen,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@fte/ui'
import { getFileKind, type FileKind } from '../../model/format'
import type { TreeNode } from '../../model/types'

const icons: Record<Exclude<FileKind, 'folder'>, LucideIcon> = {
  image: FileImage,
  video: FileVideo,
  audio: FileAudio,
  pdf: FileText,
  spreadsheet: FileSpreadsheet,
  document: FileText,
  code: FileCode,
  archive: FileArchive,
  other: File,
}

/** Folders are the one colored element in the tree, so the structure reads at a glance. */
export function FileIcon({ node, open = false, className }: { node: TreeNode; open?: boolean; className?: string }) {
  const kind = getFileKind(node)
  if (kind === 'folder') {
    const Icon = open ? FolderOpen : Folder
    return <Icon aria-hidden className={cn('text-folder size-4 shrink-0', className)} strokeWidth={1.75} />
  }
  const Icon = icons[kind]
  return <Icon aria-hidden className={cn('text-muted size-4 shrink-0', className)} strokeWidth={1.75} />
}
