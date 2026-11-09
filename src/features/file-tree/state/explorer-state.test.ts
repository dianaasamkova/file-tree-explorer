import { createFixtureTree } from '@/test/fixtures'
import { searchTree } from '../model/visible'
import { createInitialState, explorerReducer, getExpandedIds, type ExplorerAction } from './explorer-state'

const run = (...actions: ExplorerAction[]) => actions.reduce(explorerReducer, createInitialState())

describe('explorerReducer', () => {
  it('starts empty, or with a selection from the URL', () => {
    expect(createInitialState()).toMatchObject({ selectedId: null, focusedId: null, cutId: null })
    expect(createInitialState('r2')).toMatchObject({ selectedId: 'r2', focusedId: 'r2' })
  })

  it('expands and collapses while browsing', () => {
    const state = run(
      { type: 'expand', ids: ['docs', 'old'], mode: 'browse' },
      { type: 'collapse', id: 'old', mode: 'browse' },
    )
    expect(state.expandedIds).toEqual(new Set(['docs']))
  })

  it('keeps search tweaks apart from browsing, and drops them when the query changes', () => {
    const searching = run(
      { type: 'expand', ids: ['docs'], mode: 'browse' },
      { type: 'collapse', id: 'docs', mode: 'search' },
      { type: 'expand', ids: ['empty'], mode: 'search' },
    )
    expect(searching.expandedIds).toEqual(new Set(['docs']))
    expect(searching.search.collapsedIds).toEqual(new Set(['docs']))
    expect(searching.search.expandedIds).toEqual(new Set(['empty']))

    const reExpanded = explorerReducer(searching, { type: 'expand', ids: ['docs'], mode: 'search' })
    expect(reExpanded.search.collapsedIds.size).toBe(0)
    const collapsed = explorerReducer(reExpanded, { type: 'collapse', id: 'empty', mode: 'search' })
    expect(collapsed.search.expandedIds).toEqual(new Set(['docs']))

    const cleared = explorerReducer(searching, { type: 'searchChanged' })
    expect(cleared.search.expandedIds.size).toBe(0)
    expect(cleared.expandedIds).toEqual(new Set(['docs']))
    expect(explorerReducer(cleared, { type: 'searchChanged' })).toBe(cleared)
  })

  it('reveals an item: opens its folders, then focuses and selects it', () => {
    const state = run(
      { type: 'collapse', id: 'old', mode: 'search' },
      { type: 'reveal', id: 'notes', ancestorIds: ['old', 'docs'] },
    )
    expect(state.expandedIds).toEqual(new Set(['old', 'docs']))
    expect(state.search.expandedIds).toEqual(new Set(['old', 'docs']))
    expect(state.search.collapsedIds.size).toBe(0)
    expect(state).toMatchObject({ selectedId: 'notes', focusedId: 'notes' })
  })

  it('focus, select and cut', () => {
    const focused = run({ type: 'focus', id: 'r2' })
    expect(focused.focusedId).toBe('r2')
    expect(explorerReducer(focused, { type: 'focus', id: 'r2' })).toBe(focused)

    const selected = explorerReducer(focused, { type: 'select', id: 'docs' })
    expect(selected).toMatchObject({ selectedId: 'docs', focusedId: 'docs' })
    expect(explorerReducer(selected, { type: 'select', id: null })).toMatchObject({
      selectedId: null,
      focusedId: 'docs',
    })

    const cut = explorerReducer(selected, { type: 'cut', id: 'r2' })
    expect(cut.cutId).toBe('r2')
    expect(explorerReducer(cut, { type: 'cut', id: null }).cutId).toBeNull()
  })
})

describe('getExpandedIds', () => {
  const tree = createFixtureTree()

  it('uses the user’s folders while browsing', () => {
    const state = run({ type: 'expand', ids: ['empty'], mode: 'browse' })
    expect(getExpandedIds(state, null)).toBe(state.expandedIds)
  })

  it('uses the search’s folders plus tweaks while searching', () => {
    const search = searchTree(tree, 'notes')
    const state = run(
      { type: 'expand', ids: ['empty'], mode: 'browse' },
      { type: 'collapse', id: 'old', mode: 'search' },
      { type: 'expand', ids: ['r2'], mode: 'search' },
    )
    expect(getExpandedIds(state, search)).toEqual(new Set(['docs', 'r2']))
  })
})
