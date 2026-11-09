import type { TreeNode } from './types'

export type FileKind =
  'folder' | 'image' | 'video' | 'audio' | 'pdf' | 'spreadsheet' | 'document' | 'code' | 'archive' | 'other'

const kindLabels: Record<FileKind, string> = {
  folder: 'Folder',
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  pdf: 'PDF document',
  spreadsheet: 'Spreadsheet',
  document: 'Document',
  code: 'Code',
  archive: 'Archive',
  other: 'File',
}

const codeExtensions = new Set(['ts', 'tsx', 'js', 'jsx', 'json', 'yml', 'yaml', 'sh', 'css', 'html', 'sql', 'py'])

export function getFileKind(node: TreeNode): FileKind {
  if (node.type === 'folder') return 'folder'
  const [group, subtype = ''] = node.mimeType.split('/')
  const extension = node.name.includes('.') ? node.name.split('.').pop()!.toLowerCase() : ''

  if (group === 'image') return 'image'
  if (group === 'video') return 'video'
  if (group === 'audio') return 'audio'
  if (subtype === 'pdf') return 'pdf'
  if (subtype.includes('spreadsheet') || subtype === 'csv' || extension === 'csv') return 'spreadsheet'
  if (/zip|tar|gzip|compressed/.test(subtype)) return 'archive'
  if (codeExtensions.has(extension)) return 'code'
  if (group === 'text' || subtype.includes('word')) return 'document'
  return 'other'
}

export function getKindLabel(kind: FileKind): string {
  return kindLabels[kind]
}

const units = ['B', 'KB', 'MB', 'GB', 'TB']

/** 1536 → "1.5 KB". Uses 1024-based units, as file managers do. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent
  return `${value.toFixed(value < 10 ? 1 : 0).replace(/\.0$/, '')} ${units[exponent]}`
}

const dateFormat = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })

export function formatDate(iso: string): string {
  return `${dateFormat.format(new Date(iso))} UTC`
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count.toLocaleString('en')} ${count === 1 ? singular : plural}`
}
