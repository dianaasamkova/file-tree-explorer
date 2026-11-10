import type { ApiFile, ApiFolder, ApiNode, ApiTreeResponse } from '../../model/types'

/** Ids are derived from the path, so links like `?file=finance/budget-2026-xlsx` stay stable. */
function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

type FileSpec = [name: string, size: number, mimeType: string, modifiedAt: string]
type Spec = FileSpec | { folder: string; children: Spec[] }

function build(specs: Spec[], parentPath = ''): ApiNode[] {
  return specs.map((spec) => {
    if ('folder' in spec) {
      const id = parentPath + slug(spec.folder)
      const folder: ApiFolder = { id, name: spec.folder, type: 'folder', children: build(spec.children, `${id}/`) }
      return folder
    }
    const [name, size, mimeType, modifiedAt] = spec
    const file: ApiFile = { id: parentPath + slug(name), name, type: 'file', size, mimeType, modifiedAt }
    return file
  })
}

const pdf = 'application/pdf'
const md = 'text/markdown'
const xlsx = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const docx = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const ts = 'text/typescript'

/** The id of the folder the mock server treats as read-only. The client is not told about it. */
export const SAMPLE_LOCKED_FOLDER_ID = 'archive-read-only'

const spec: Spec[] = [
  ['Welcome.md', 2_184, md, '2026-10-30T09:12:00Z'],
  {
    folder: 'Clients',
    children: [
      {
        folder: 'Acme Corp',
        children: [
          ['Brand guidelines.pdf', 4_812_331, pdf, '2026-08-14T15:40:00Z'],
          ['Logo.svg', 18_442, 'image/svg+xml', '2026-08-14T15:42:00Z'],
          ['Kickoff notes.md', 6_210, md, '2026-07-02T11:05:00Z'],
        ],
      },
      {
        folder: 'Northwind',
        children: [
          ['Proposal v2.docx', 182_004, docx, '2026-09-01T08:30:00Z'],
          ['Proposal v10.docx', 196_778, docx, '2026-10-21T17:55:00Z'],
          ['Contract (signed).pdf', 1_204_551, pdf, '2026-10-24T10:02:00Z'],
          ['Kickoff notes.md', 4_877, md, '2026-08-28T13:20:00Z'],
        ],
      },
    ],
  },
  { folder: 'Drafts', children: [] },
  {
    folder: 'Engineering',
    children: [
      ['Architecture.md', 12_904, md, '2026-10-12T16:00:00Z'],
      ['docker-compose.yml', 1_288, 'application/yaml', '2026-09-18T12:44:00Z'],
      {
        folder: 'api',
        children: [
          ['openapi.yml', 22_610, 'application/yaml', '2026-10-05T09:10:00Z'],
          ['server.ts', 8_302, ts, '2026-10-29T18:22:00Z'],
        ],
      },
      {
        folder: 'web',
        children: [
          ['App.tsx', 3_418, ts, '2026-11-02T10:31:00Z'],
          ['package.json', 1_907, 'application/json', '2026-11-02T10:31:00Z'],
          ['vite.config.ts', 734, ts, '2026-10-27T14:03:00Z'],
        ],
      },
    ],
  },
  {
    folder: 'Finance',
    children: [
      ['Budget 2026.xlsx', 88_120, xlsx, '2026-01-09T09:00:00Z'],
      ['Expenses Q3.csv', 14_305, 'text/csv', '2026-10-03T08:15:00Z'],
      {
        folder: 'Invoices',
        children: [
          ['Invoice 2026-07.pdf', 96_210, pdf, '2026-07-31T12:00:00Z'],
          ['Invoice 2026-08.pdf', 97_004, pdf, '2026-08-31T12:00:00Z'],
          ['Invoice 2026-09.pdf', 95_880, pdf, '2026-09-30T12:00:00Z'],
          ['Invoice 2026-10.pdf', 98_336, pdf, '2026-10-31T12:00:00Z'],
        ],
      },
      {
        folder: 'Receipts',
        children: [
          ['Conference tickets.pdf', 211_400, pdf, '2026-05-17T19:40:00Z'],
          ['Laptop.jpg', 1_822_016, 'image/jpeg', '2026-04-02T10:11:00Z'],
        ],
      },
    ],
  },
  {
    folder: 'Media',
    children: [
      ['Product demo.mp4', 148_220_331, 'video/mp4', '2026-09-22T16:45:00Z'],
      ['Podcast intro.mp3', 3_904_112, 'audio/mpeg', '2026-06-11T08:00:00Z'],
      {
        folder: 'Photos',
        children: [
          ['Offsite 1.jpg', 3_301_244, 'image/jpeg', '2026-06-20T14:01:00Z'],
          ['Offsite 2.jpg', 2_988_410, 'image/jpeg', '2026-06-20T14:03:00Z'],
          ['Offsite 10.jpg', 3_115_902, 'image/jpeg', '2026-06-20T14:30:00Z'],
        ],
      },
    ],
  },
  {
    folder: 'Team',
    children: [
      ['Onboarding checklist.md', 5_120, md, '2026-09-09T07:50:00Z'],
      ['Org chart.pdf', 402_118, pdf, '2026-10-01T11:11:00Z'],
      ['Holidays 2026.xlsx', 21_904, xlsx, '2026-01-05T09:30:00Z'],
    ],
  },
  {
    folder: 'Archive (read-only)',
    children: [
      ['2024 annual report.pdf', 6_402_771, pdf, '2025-02-14T10:00:00Z'],
      ['Old website.zip', 52_118_004, 'application/zip', '2025-01-08T18:20:00Z'],
    ],
  },
]

/** A small, realistic drive (47 items) for the default view. */
export function createSampleDataset(): ApiTreeResponse {
  return { items: build(spec) }
}
