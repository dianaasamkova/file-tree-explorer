import { file } from '../test/fixtures'
import { formatBytes, formatDate, getFileKind, getKindLabel, pluralize } from './format'
import type { TreeNode } from './types'

const asNode = (name: string, mimeType: string): TreeNode => ({ ...file('x', name, { mimeType }), parentId: null })

describe('getFileKind', () => {
  it.each([
    ['photo.jpg', 'image/jpeg', 'image'],
    ['clip.mp4', 'video/mp4', 'video'],
    ['song.mp3', 'audio/mpeg', 'audio'],
    ['doc.pdf', 'application/pdf', 'pdf'],
    ['sheet.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'spreadsheet'],
    ['data.csv', 'text/csv', 'spreadsheet'],
    ['data.csv', 'application/octet-stream', 'spreadsheet'],
    ['site.zip', 'application/zip', 'archive'],
    ['app.tsx', 'text/typescript', 'code'],
    ['config.yml', 'application/yaml', 'code'],
    ['notes.md', 'text/markdown', 'document'],
    ['letter.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'document'],
    ['binary', 'application/octet-stream', 'other'],
  ])('%s (%s) is %s', (name, mime, kind) => {
    expect(getFileKind(asNode(name, mime))).toBe(kind)
  })

  it('knows folders', () => {
    expect(getFileKind({ id: 'f', name: 'F', type: 'folder', parentId: null, childIds: [] })).toBe('folder')
  })

  it('has a readable label for each kind', () => {
    expect(getKindLabel('pdf')).toBe('PDF document')
    expect(getKindLabel('other')).toBe('File')
  })
})

describe('formatBytes', () => {
  it.each([
    [0, '0 B'],
    [1023, '1023 B'],
    [1024, '1 KB'],
    [1536, '1.5 KB'],
    [96_210, '94 KB'],
    [148_220_331, '141 MB'],
    [5 * 1024 ** 3, '5 GB'],
    [3 * 1024 ** 5, '3072 TB'],
  ])('%d → %s', (bytes, text) => {
    expect(formatBytes(bytes)).toBe(text)
  })
})

describe('formatDate and pluralize', () => {
  it('formats dates in UTC so they are the same for everyone', () => {
    expect(formatDate('2026-09-30T12:00:00Z')).toBe('Sep 30, 2026, 12:00 PM UTC')
  })

  it('pluralizes with grouping', () => {
    expect(pluralize(1, 'item')).toBe('1 item')
    expect(pluralize(10_000, 'item')).toBe('10,000 items')
    expect(pluralize(2, 'match', 'matches')).toBe('2 matches')
  })
})
