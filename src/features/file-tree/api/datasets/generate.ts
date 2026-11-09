import type { ApiFile, ApiFolder, ApiTreeResponse } from '../../model/types'

/** Small, fast, seedable PRNG (mulberry32): the same seed always gives the same drive. */
export function createRandom(seed: number) {
  let state = seed >>> 0
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1))
  const pick = <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)]!
  return { next, int, pick }
}

const folderNames = [
  'Projects',
  'Reports',
  'Design',
  'Research',
  'Contracts',
  'Marketing',
  'Sales',
  'Legal',
  'Assets',
  'Exports',
  'Backups',
  'Meetings',
  'Releases',
  'Templates',
  'Data',
  'Clients',
] as const

const fileTypes = [
  { stem: ['Report', 'Summary', 'Brief', 'Minutes', 'Plan'], ext: 'pdf', mime: 'application/pdf', size: [40e3, 9e6] },
  { stem: ['Notes', 'Readme', 'Changelog', 'Draft'], ext: 'md', mime: 'text/markdown', size: [1e3, 60e3] },
  { stem: ['Photo', 'Screenshot', 'Banner', 'Mockup'], ext: 'png', mime: 'image/png', size: [80e3, 6e6] },
  { stem: ['Recording', 'Demo', 'Interview'], ext: 'mp4', mime: 'video/mp4', size: [5e6, 400e6] },
  { stem: ['Forecast', 'Budget', 'Inventory', 'Export'], ext: 'csv', mime: 'text/csv', size: [2e3, 3e6] },
  { stem: ['index', 'utils', 'config', 'schema'], ext: 'ts', mime: 'text/typescript', size: [300, 40e3] },
  { stem: ['Archive', 'Bundle', 'Snapshot'], ext: 'zip', mime: 'application/zip', size: [1e6, 900e6] },
] as const

const BASE_DATE = Date.UTC(2026, 10, 1)
const DAY = 86_400_000
const MAX_DEPTH = 5

/**
 * A deterministic drive with exactly `total` items, used to show that rendering stays fast with
 * thousands of rows. About 1 in 7 items is a folder; folders are at most 5 levels deep.
 */
export function generateDataset(total = 10_000, seed = 2026): ApiTreeResponse {
  const random = createRandom(seed)
  const items: ApiTreeResponse['items'] = []
  const folders: { node: ApiFolder | null; depth: number; names: Set<string> }[] = [
    { node: null, depth: 0, names: new Set() },
  ]
  let count = 0

  const uniqueName = (names: Set<string>, base: string, ext = '') => {
    let name = `${base}${ext}`
    for (let copy = 2; names.has(name.toLowerCase()); copy += 1) name = `${base} (${copy})${ext}`
    names.add(name.toLowerCase())
    return name
  }

  while (count < total) {
    // The first items are top-level folders, so the drive has a recognizable shape.
    const parent = count < 12 ? folders[0]! : random.pick(folders)
    const siblings = parent.node ? parent.node.children : items
    const makeFolder = count < 12 || (parent.depth < MAX_DEPTH && random.next() < 0.15)
    count += 1
    const id = `g${count}`

    if (makeFolder) {
      const name = uniqueName(parent.names, random.pick(folderNames))
      const folder: ApiFolder = { id, name, type: 'folder', children: [] }
      siblings.push(folder)
      folders.push({ node: folder, depth: parent.depth + 1, names: new Set() })
    } else {
      const type = random.pick(fileTypes)
      const [min, max] = type.size
      const name = uniqueName(parent.names, `${random.pick(type.stem)} ${random.int(1, 400)}`, `.${type.ext}`)
      const file: ApiFile = {
        id,
        name,
        type: 'file',
        size: Math.round(min + random.next() * (max - min)),
        mimeType: type.mime,
        modifiedAt: new Date(BASE_DATE - random.int(0, 900) * DAY - random.int(0, DAY / 1000) * 1000).toISOString(),
      }
      siblings.push(file)
    }
  }

  return { items }
}
