import { screen, waitFor, within } from '@testing-library/react'
import { findItem, getActiveItem, getDetails, getItem, queryItem, renderExplorer, searchParam } from '../test/render'
import { ApiError, createMockApi } from '../api/mock-api'

async function renderLoaded(url?: string) {
  const app = renderExplorer({ url })
  await findItem('Clients')
  return app
}

describe('loading', () => {
  it('shows a skeleton, then the root of the drive sorted folders first', async () => {
    renderExplorer()
    expect(screen.getByText('Loading files…')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
    await findItem('Clients')
    const names = screen.getAllByRole('treeitem').map((item) => item.textContent)
    expect(names[0]).toBe('Archive (read-only)')
    expect(names.at(-1)).toBe('Welcome.md2.1 KB')
    expect(screen.getByRole('status')).toHaveTextContent('47 items')
  })

  it('shows an error with a working Retry', async () => {
    const api = createMockApi()
    const getTree = api.getTree
    api.getTree = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(503, 'The server is unavailable.'))
      .mockImplementation(getTree)
    const { user } = renderExplorer({ api })

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent("Couldn't load files")
    expect(alert).toHaveTextContent('The server is unavailable.')
    await user.click(within(alert).getByRole('button', { name: 'Retry' }))
    expect(await findItem('Clients')).toBeInTheDocument()
  })

  it('keeps focus and text in the search box when the drive finishes loading', async () => {
    const api = createMockApi()
    const getTree = api.getTree
    let finish: () => void = () => {}
    api.getTree = vi.fn<typeof getTree>(
      (dataset, signal) => new Promise((resolve) => (finish = () => resolve(getTree(dataset, signal)))),
    )
    const { user } = renderExplorer({ api })
    const input = screen.getByRole('searchbox')

    await user.type(input, 'kick')
    finish()

    expect(await screen.findAllByRole('treeitem', { name: /^Kickoff notes/ })).toHaveLength(2)
    expect(screen.getByRole('searchbox')).toBe(input)
    expect(input).toHaveFocus()
    expect(input).toHaveValue('kick')
  })

  it('shows the skeleton again while retrying', async () => {
    const api = createMockApi()
    let finish: () => void = () => {}
    api.getTree = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(503, 'The server is unavailable.'))
      .mockReturnValueOnce(new Promise((resolve) => (finish = () => resolve({ items: [] }))))
    const { user } = renderExplorer({ api })

    await user.click(await screen.findByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Loading files…')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    finish()
    expect(await screen.findByText('This drive is empty')).toBeInTheDocument()
  })

  it('keeps the tree when a background refresh fails', async () => {
    const api = createMockApi()
    const { user } = renderExplorer({ api })
    await findItem('Clients')
    // Every move refreshes the tree afterwards; make that refresh fail.
    api.getTree = vi.fn().mockRejectedValue(new ApiError(503, 'The server is unavailable.'))

    await user.click(getItem('Welcome.md'))
    await user.selectOptions(getDetails().getByRole('combobox', { name: 'Move to' }), 'drafts')
    await user.click(getDetails().getByRole('button', { name: 'Move' }))

    await waitFor(() => expect(api.getTree).toHaveBeenCalled())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(getItem('Welcome.md')).toHaveAttribute('aria-level', '2')
  })

  it('says when the drive is empty', async () => {
    const api = createMockApi()
    api.getTree = vi.fn().mockResolvedValue({ items: [] })
    renderExplorer({ api })
    expect(await screen.findByText('This drive is empty')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('0 items')
  })
})

describe('keyboard', () => {
  it('moves focus with arrows, Home, End and pages, and opens folders', async () => {
    const { user } = await renderLoaded()
    const tree = screen.getByRole('tree')
    tree.focus()
    expect(getActiveItem()).toBe(getItem('Archive'))

    await user.keyboard('{ArrowDown}')
    expect(getActiveItem()).toBe(getItem('Clients'))
    await user.keyboard('{ArrowRight}')
    expect(getItem('Clients')).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard('{ArrowRight}')
    expect(getActiveItem()).toBe(getItem('Acme Corp'))
    expect(getItem('Acme Corp')).toHaveAttribute('aria-level', '2')

    await user.keyboard('{ArrowLeft}')
    expect(getActiveItem()).toBe(getItem('Clients'))
    await user.keyboard('{ArrowLeft}')
    expect(getItem('Clients')).toHaveAttribute('aria-expanded', 'false')
    expect(queryItem('Acme Corp')).not.toBeInTheDocument()

    await user.keyboard('{End}')
    expect(getActiveItem()).toBe(getItem('Welcome.md'))
    await user.keyboard('{ArrowRight}{ArrowLeft}')
    expect(getActiveItem()).toBe(getItem('Welcome.md'))
    await user.keyboard('{Home}')
    expect(getActiveItem()).toBe(getItem('Archive'))
    await user.keyboard('{PageDown}')
    expect(getActiveItem()).toBe(getItem('Welcome.md'))
    await user.keyboard('{PageUp}')
    expect(getActiveItem()).toBe(getItem('Archive'))
    await user.keyboard('{ArrowUp}')
    expect(getActiveItem()).toBe(getItem('Archive'))

    // Shortcuts with Alt belong to the browser and the OS.
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}')
    expect(getActiveItem()).toBe(getItem('Archive'))
  })

  it('selects with Enter and Space, expands siblings with *, and jumps by typing', async () => {
    const { user } = await renderLoaded()
    screen.getByRole('tree').focus()

    await user.keyboard('{ArrowDown}{Enter}')
    expect(getItem('Clients')).toHaveAttribute('aria-selected', 'true')
    expect(getItem('Clients')).toHaveAttribute('aria-expanded', 'true')
    expect(getDetails().getByText('Clients', { selector: 'p' })).toBeInTheDocument()

    await user.keyboard('{ArrowDown} ')
    expect(getItem('Acme Corp')).toHaveAttribute('aria-selected', 'true')
    expect(getItem('Clients')).toHaveAttribute('aria-selected', 'false')

    await user.keyboard('*')
    expect(getItem('Northwind')).toHaveAttribute('aria-expanded', 'true')
    expect(getItem('Acme Corp')).toHaveAttribute('aria-expanded', 'true')

    await user.keyboard('te')
    expect(getActiveItem()).toBe(getItem('Team'))
    await user.keyboard('q')
    expect(getActiveItem()).toBe(getItem('Team'))
    await user.keyboard('{Escape}')
    expect(getActiveItem()).toBe(getItem('Team'))
  })

  it('keeps the focused row in the DOM, so aria-activedescendant always points to a real item', async () => {
    const { user } = renderExplorer({ url: '/?dataset=large' })
    await findItem('Assets')
    screen.getByRole('tree').focus()
    await user.keyboard('*{End}')
    // jsdom doesn't scroll, so the last row is far outside the rendered window, yet it exists.
    expect(getActiveItem()).not.toBeNull()
    expect(getActiveItem()).toHaveAttribute('aria-level', '1')
  })

  it('scrolls when focus moves, not when rows change above the focused item', async () => {
    const { user } = await renderLoaded()
    const scrollTo = vi.spyOn(Element.prototype, 'scrollTo')
    screen.getByRole('tree').focus()
    await user.keyboard('*{End}')
    // Welcome.md is the 26th row, below the 640 px viewport: focusing it scrolls.
    await waitFor(() => expect(scrollTo).toHaveBeenCalled())
    const calls = scrollTo.mock.calls.length

    await user.click(within(getItem('Archive')).getByTestId('toggle'))
    expect(getItem('Archive')).toHaveAttribute('aria-expanded', 'false')
    expect(scrollTo).toHaveBeenCalledTimes(calls)
  })

  it('"/" focuses the search box', async () => {
    const { user } = await renderLoaded()
    screen.getByRole('tree').focus()
    await user.keyboard('/')
    expect(screen.getByRole('searchbox')).toHaveFocus()
  })
})

describe('mouse', () => {
  it('selects on click and toggles with the chevron or a double-click', async () => {
    const { user } = await renderLoaded()
    await user.click(getItem('Finance'))
    expect(getItem('Finance')).toHaveAttribute('aria-selected', 'true')
    expect(getItem('Finance')).toHaveAttribute('aria-expanded', 'false')

    await user.click(within(getItem('Finance')).getByTestId('toggle'))
    expect(getItem('Finance')).toHaveAttribute('aria-expanded', 'true')
    await user.dblClick(getItem('Invoices'))
    expect(getItem('Invoices')).toHaveAttribute('aria-expanded', 'true')
    expect(getItem('Invoice 2026-07.pdf')).toHaveAttribute('aria-level', '3')
  })
})

describe('search', () => {
  it('filters, highlights matches, opens their folders and announces the count', async () => {
    const { user } = await renderLoaded()
    await user.type(screen.getByRole('searchbox'), 'kick')

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('2 matches for “kick” in 47 items'))
    expect(screen.getAllByRole('treeitem').map((item) => item.textContent?.replace(/\d.*$/, ''))).toEqual([
      'Clients',
      'Acme Corp',
      'Kickoff notes.md',
      'Northwind',
      'Kickoff notes.md',
    ])
    expect(screen.getAllByText('Kick', { selector: 'mark' })).toHaveLength(2)
    expect(searchParam('q')).toBe('kick')
  })

  it('restores the folders the user had open when the search is cleared', async () => {
    const { user } = await renderLoaded()
    await user.click(within(getItem('Team')).getByTestId('toggle'))
    await user.type(screen.getByRole('searchbox'), 'invoice')
    await findItem('Invoice 2026-07.pdf')
    expect(queryItem('Team')).not.toBeInTheDocument()

    // Collapsing during a search does not touch the user's own folders.
    await user.click(within(getItem('Finance')).getByTestId('toggle'))
    expect(queryItem('Invoices')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(await findItem('Onboarding checklist.md')).toBeInTheDocument()
    expect(getItem('Finance')).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('searchbox')).toHaveFocus()
    expect(searchParam('q')).toBeNull()
  })

  it('shows an empty state with Clear search, and Escape clears too', async () => {
    const { user } = await renderLoaded()
    const input = screen.getByRole('searchbox')
    await user.type(input, 'zzz')
    expect(await screen.findByText('No files or folders match “zzz”')).toBeInTheDocument()
    await user.click(screen.getByText('Clear search', { selector: 'button' }))
    expect(await findItem('Clients')).toBeInTheDocument()

    await user.type(input, 'team{Escape}')
    expect(input).toHaveValue('')
  })

  it('a matching folder keeps all its content', async () => {
    const { user } = await renderLoaded()
    await user.type(screen.getByRole('searchbox'), 'photos')
    await user.click(within(await findItem('Photos')).getByTestId('toggle'))
    expect(getItem('Offsite 10.jpg')).toBeInTheDocument()
  })
})

describe('details panel', () => {
  it('shows a hint when nothing is selected', async () => {
    await renderLoaded()
    expect(getDetails().getByText('Nothing selected')).toBeInTheDocument()
  })

  it('shows file details and folder totals', async () => {
    const { user } = await renderLoaded()
    await user.click(getItem('Welcome.md'))
    const details = getDetails()
    expect(details.getByText('Document')).toBeInTheDocument()
    expect(details.getByText('2.1 KB')).toBeInTheDocument()
    expect(details.getByText('Oct 30, 2026, 9:12 AM UTC')).toBeInTheDocument()

    await user.click(getItem('Clients'))
    expect(getDetails().getByText('2 folders, 7 files')).toBeInTheDocument()
    await user.click(getItem('Drafts'))
    expect(getDetails().getByText('Empty')).toBeInTheDocument()
  })

  it('reveals a folder from the location path', async () => {
    const { user } = await renderLoaded()
    await user.type(screen.getByRole('searchbox'), 'logo')
    await user.click(await findItem('Logo.svg'))
    const path = getDetails().getByRole('navigation', { name: 'Location' })
    await user.click(within(path).getByRole('button', { name: 'Clients' }))

    expect(screen.getByRole('searchbox')).toHaveValue('logo')
    expect(getItem('Clients')).toHaveAttribute('aria-selected', 'true')
    expect(getItem('Acme Corp')).toBeInTheDocument()
    expect(screen.getByRole('tree')).toHaveFocus()
    expect(getActiveItem()).toBe(getItem('Clients'))
  })
})

describe('URL', () => {
  it('opens a shared link with the search and the selected file', async () => {
    renderExplorer({ url: '/?q=invoice&file=finance/invoices/invoice-2026-09-pdf' })
    expect(await findItem('Invoice 2026-09.pdf')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('searchbox')).toHaveValue('invoice')
    expect(getDetails().getByText('Invoice 2026-09.pdf')).toBeInTheDocument()
  })

  it('opens a linked file inside a matching folder while searching', async () => {
    // "media" matches the Media folder: its content is shown, but not opened by the search.
    renderExplorer({ url: '/?q=media&file=media/photos/offsite-1-jpg' })
    expect(await findItem('Offsite 1.jpg')).toHaveAttribute('aria-selected', 'true')
    expect(getItem('Photos')).toHaveAttribute('aria-expanded', 'true')
  })

  it('opens the folders above a linked file', async () => {
    renderExplorer({ url: '/?file=engineering/web/app-tsx' })
    expect(await findItem('App.tsx')).toHaveAttribute('aria-level', '3')
  })

  it('drops a link to an item that does not exist', async () => {
    renderExplorer({ url: '/?file=nope' })
    await findItem('Clients')
    await waitFor(() => expect(searchParam('file')).toBeNull())
    expect(getDetails().getByText('Nothing selected')).toBeInTheDocument()
  })

  it('writes the selection to the URL', async () => {
    const { user } = await renderLoaded()
    await user.click(getItem('Welcome.md'))
    expect(searchParam('file')).toBe('welcome-md')
  })
})
