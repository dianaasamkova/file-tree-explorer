import { createEvent, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { findItem, getActiveItem, getDetails, getItem, queryItem, renderExplorer } from '../test/render'
import { ApiError, createMockApi } from '../api/mock-api'

async function renderLoaded(api = createMockApi()) {
  const app = renderExplorer({ api })
  await findItem('Clients')
  return app
}

const expectAtRoot = (name: string) => expect(getItem(name)).toHaveAttribute('aria-level', '1')

describe('cut and paste', () => {
  it('moves the focused item with Ctrl+X and Ctrl+V, and Undo puts it back', async () => {
    const { user } = await renderLoaded()
    screen.getByRole('tree').focus()
    await user.keyboard('{End}{Control>}x{/Control}')
    expect(screen.getByText(/is ready to move/)).toHaveTextContent('“Welcome.md” is ready to move')
    expect(within(getItem('Welcome.md')).getByLabelText('Cut')).toBeInTheDocument()

    await user.keyboard('{Home}{ArrowDown}{ArrowDown}{Control>}v{/Control}')
    expect(await screen.findByText('Moved “Welcome.md” to Drafts')).toBeInTheDocument()
    expect(getItem('Drafts')).toHaveAttribute('aria-expanded', 'true')
    expect(getItem('Welcome.md')).toHaveAttribute('aria-level', '2')
    expect(screen.queryByText(/is ready to move/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(await screen.findByText('Moved “Welcome.md” back to Drive')).toBeInTheDocument()
    await waitFor(() => expectAtRoot('Welcome.md'))
  })

  it('pasting onto a file moves into that file’s folder', async () => {
    const { user } = await renderLoaded()
    screen.getByRole('tree').focus()
    await user.keyboard('{End}{Meta>}x{/Meta}')
    // Engineering › api, web, Architecture.md: paste on the file.
    await user.keyboard('{Home}{ArrowDown}{ArrowDown}{ArrowDown}{ArrowRight}{ArrowDown}{ArrowDown}{ArrowDown}')
    expect(getActiveItem()).toBe(getItem('Architecture.md'))
    await user.keyboard('{Meta>}v{/Meta}')
    expect(await screen.findByText('Moved “Welcome.md” to Engineering')).toBeInTheDocument()
  })

  it('refuses an invalid paste with a reason, and Escape cancels the cut', async () => {
    const { user } = await renderLoaded()
    screen.getByRole('tree').focus()
    await user.keyboard('{ArrowDown}{Control>}x{/Control}{ArrowRight}{ArrowDown}{Control>}v{/Control}')
    expect(await screen.findByText('Couldn’t move “Clients”'.replace('’', "'"))).toBeInTheDocument()
    expect(screen.getByText('A folder cannot be moved into one of its own subfolders.')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByText(/is ready to move/)).not.toBeInTheDocument()
    // With nothing cut, paste does nothing.
    await user.keyboard('{Control>}v{/Control}')
    expect(getActiveItem()).toBe(getItem('Acme Corp'))
  })
})

describe('Move to picker', () => {
  it('moves the selected item and disables folders it cannot go to', async () => {
    const { user } = await renderLoaded()
    await user.click(within(getItem('Clients')).getByTestId('toggle'))
    await user.click(within(getItem('Acme Corp')).getByTestId('toggle'))
    await user.click(getItem('Kickoff notes.md'))

    const select = getDetails().getByRole('combobox', { name: 'Move to' })
    expect(within(select).getByRole('option', { name: /Acme Corp/ })).toBeDisabled()
    expect(within(select).getByRole('option', { name: /Northwind/ })).toBeDisabled()
    expect(getDetails().getByRole('button', { name: 'Move' })).toBeDisabled()

    await user.selectOptions(select, 'drafts')
    await user.click(getDetails().getByRole('button', { name: 'Move' }))
    expect(await screen.findByText('Moved “Kickoff notes.md” to Drafts')).toBeInTheDocument()
    expect(getDetails().getByRole('navigation', { name: 'Location' })).toHaveTextContent('Drafts')
  })

  it('does nothing until a folder is chosen', async () => {
    const { user } = await renderLoaded()
    await user.click(getItem('Welcome.md'))
    fireEvent.submit(getDetails().getByRole('combobox', { name: 'Move to' }).closest('form')!)
    expect(screen.queryByText(/Moved/)).not.toBeInTheDocument()
    expectAtRoot('Welcome.md')
  })

  it('can move to the root of the drive', async () => {
    const { user } = await renderLoaded()
    await user.click(within(getItem('Team')).getByTestId('toggle'))
    await user.click(getItem('Org chart.pdf'))
    await user.selectOptions(getDetails().getByRole('combobox', { name: 'Move to' }), 'Drive')
    await user.click(getDetails().getByRole('button', { name: 'Move' }))
    await waitFor(() => expectAtRoot('Org chart.pdf'))
  })
})

describe('optimistic update', () => {
  it('moves at once, then rolls back and explains when the server refuses', async () => {
    const api = createMockApi()
    let reject: (error: Error) => void = () => {}
    api.moveNode = vi.fn(() => new Promise<void>((_, fail) => (reject = fail)))
    const { user } = await renderLoaded(api)

    await user.click(getItem('Team'))
    await user.selectOptions(getDetails().getByRole('combobox', { name: 'Move to' }), 'archive-read-only')
    await user.click(getDetails().getByRole('button', { name: 'Move' }))

    // Optimistic: already inside the archive, before the server answers.
    await waitFor(() => expect(getItem('Team')).toHaveAttribute('aria-level', '2'))
    expect(api.moveNode).toHaveBeenCalledWith('sample', 'team', 'archive-read-only')

    reject(new ApiError(403, '“Archive (read-only)” is read-only.'))
    expect(await screen.findByText("Couldn't move “Team”")).toBeInTheDocument()
    expect(screen.getByText('“Archive (read-only)” is read-only.')).toBeInTheDocument()
    await waitFor(() => expectAtRoot('Team'))
  })

  it('the real mock server refuses moves out of the read-only folder', async () => {
    const { user } = await renderLoaded()
    await user.click(within(getItem('Archive')).getByTestId('toggle'))
    await user.click(getItem('Old website.zip'))
    await user.selectOptions(getDetails().getByRole('combobox', { name: 'Move to' }), 'Drive')
    await user.click(getDetails().getByRole('button', { name: 'Move' }))
    expect(await screen.findByText(/Items can't be moved into or out of it/)).toBeInTheDocument()
    await waitFor(() => expect(getItem('Old website.zip')).toHaveAttribute('aria-level', '2'))
  })
})

describe('drag and drop', () => {
  const dataTransfer = () => ({ setData: vi.fn(), getData: vi.fn(), effectAllowed: 'all', dropEffect: 'none' })

  it('drops a file onto a folder', async () => {
    await renderLoaded()
    const data = dataTransfer()
    fireEvent.dragStart(getItem('Welcome.md'), { dataTransfer: data })
    expect(data.setData).toHaveBeenCalledWith('text/plain', 'Welcome.md')

    // `fireEvent` returns false when the handler called preventDefault(), i.e. accepted the drop.
    expect(fireEvent.dragOver(getItem('Drafts'), { dataTransfer: data })).toBe(false)
    expect(data.dropEffect).toBe('move')
    fireEvent.drop(getItem('Drafts'), { dataTransfer: data })
    expect(await screen.findByText('Moved “Welcome.md” to Drafts')).toBeInTheDocument()
    expect(getItem('Welcome.md')).toHaveAttribute('aria-level', '2')
  })

  it('drops onto a file’s folder, and onto empty space for the root', async () => {
    const { user } = await renderLoaded()
    await user.click(within(getItem('Team')).getByTestId('toggle'))
    const data = dataTransfer()

    fireEvent.dragStart(getItem('Welcome.md'), { dataTransfer: data })
    fireEvent.dragOver(getItem('Org chart.pdf'), { dataTransfer: data })
    fireEvent.drop(getItem('Org chart.pdf'), { dataTransfer: data })
    expect(await screen.findByText('Moved “Welcome.md” to Team')).toBeInTheDocument()

    fireEvent.dragStart(getItem('Holidays 2026.xlsx'), { dataTransfer: data })
    const tree = screen.getByRole('tree')
    expect(fireEvent.dragOver(tree, { dataTransfer: data })).toBe(false)
    fireEvent.drop(tree, { dataTransfer: data })
    expect(await screen.findByText('Moved “Holidays 2026.xlsx” to Drive')).toBeInTheDocument()
    expectAtRoot('Holidays 2026.xlsx')
  })

  it('refuses an invalid target and says why', async () => {
    const { user } = await renderLoaded()
    await user.click(within(getItem('Clients')).getByTestId('toggle'))
    const data = dataTransfer()

    fireEvent.dragStart(getItem('Clients'), { dataTransfer: data })
    expect(fireEvent.dragOver(getItem('Acme Corp'), { dataTransfer: data })).toBe(true)
    expect(screen.getByText(/Can't move here/)).toHaveTextContent('one of its own subfolders')
    // Hovering the dragged item itself shows no hint.
    fireEvent.dragOver(getItem('Clients'), { dataTransfer: data })
    expect(screen.queryByText(/Can't move here/)).not.toBeInTheDocument()

    // Moving between rows keeps the hint; leaving the tree clears it.
    fireEvent.dragOver(getItem('Acme Corp'), { dataTransfer: data })
    // jsdom has no DragEvent, so fireEvent would drop relatedTarget: set it on the event itself.
    const leave = createEvent.dragLeave(screen.getByRole('tree'))
    Object.defineProperty(leave, 'relatedTarget', { value: getItem('Northwind') })
    fireEvent(screen.getByRole('tree'), leave)
    expect(screen.getByText(/Can't move here/)).toBeInTheDocument()
    fireEvent.dragLeave(screen.getByRole('tree'), { relatedTarget: document.body })
    expect(screen.queryByText(/Can't move here/)).not.toBeInTheDocument()
    fireEvent.drop(getItem('Acme Corp'), { dataTransfer: data })
    fireEvent.dragEnd(getItem('Clients'), { dataTransfer: data })
    expect(getItem('Clients')).toHaveAttribute('aria-level', '1')
  })

  it('opens a folder after hovering it for a moment', async () => {
    await renderLoaded()
    const data = dataTransfer()
    fireEvent.dragStart(getItem('Welcome.md'), { dataTransfer: data })
    fireEvent.dragOver(getItem('Media'), { dataTransfer: data })
    fireEvent.dragOver(getItem('Media'), { dataTransfer: data })
    await waitFor(() => expect(getItem('Media')).toHaveAttribute('aria-expanded', 'true'), { timeout: 1500 })
    expect(queryItem('Photos')).toBeInTheDocument()
    fireEvent.dragEnd(getItem('Welcome.md'), { dataTransfer: data })
  })

  it('scrolls the tree while an item is held near its top or bottom edge', async () => {
    await renderLoaded()
    const tree = screen.getByRole('tree')
    // jsdom doesn't scroll: record what the tree asks for.
    let scrollTop = 0
    Object.defineProperty(tree, 'scrollTop', { get: () => scrollTop, set: (value: number) => (scrollTop = value) })
    const dragOverAt = (target: Element, clientY: number) => {
      const event = createEvent.dragOver(target, { dataTransfer: dataTransfer() })
      Object.defineProperty(event, 'clientY', { value: clientY })
      fireEvent(target, event)
    }
    // The tree's box is 0–640 px tall in the test setup.
    dragOverAt(getItem('Team'), 630)
    expect(scrollTop).toBe(0)

    fireEvent.dragStart(getItem('Welcome.md'), { dataTransfer: dataTransfer() })
    dragOverAt(getItem('Team'), 630)
    dragOverAt(getItem('Team'), 635)
    await waitFor(() => expect(scrollTop).toBeGreaterThan(20))

    // Back in the middle: scrolling stops.
    dragOverAt(getItem('Team'), 320)
    const stoppedAt = scrollTop
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(scrollTop).toBe(stoppedAt)

    // Near the top it scrolls up; leaving the tree stops it.
    dragOverAt(getItem('Clients'), 5)
    await waitFor(() => expect(scrollTop).toBeLessThan(stoppedAt))
    fireEvent.dragLeave(tree, { relatedTarget: document.body })
    const leftAt = scrollTop
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(scrollTop).toBe(leftAt)

    // Ending the drag stops a running scroll too.
    dragOverAt(getItem('Team'), 640)
    fireEvent.dragEnd(getItem('Welcome.md'), { dataTransfer: dataTransfer() })
    const endedAt = scrollTop
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(scrollTop).toBe(endedAt)
  })

  it('opens folders only for drags from this tree, and stops when the drag leaves the tree', async () => {
    await renderLoaded()
    // A file dragged in from the desktop: nothing can be dropped, so nothing opens.
    fireEvent.dragOver(getItem('Media'), { dataTransfer: dataTransfer() })
    await new Promise((resolve) => setTimeout(resolve, 800))
    expect(getItem('Media')).toHaveAttribute('aria-expanded', 'false')

    // Hovering a folder and then leaving the tree cancels the pending open.
    fireEvent.dragStart(getItem('Welcome.md'), { dataTransfer: dataTransfer() })
    fireEvent.dragOver(getItem('Media'), { dataTransfer: dataTransfer() })
    fireEvent.dragLeave(screen.getByRole('tree'), { relatedTarget: document.body })
    await new Promise((resolve) => setTimeout(resolve, 800))
    expect(getItem('Media')).toHaveAttribute('aria-expanded', 'false')
    fireEvent.dragEnd(getItem('Welcome.md'), { dataTransfer: dataTransfer() })
  })

  it('keeps the dragged row in the DOM while the tree scrolls far away from it', async () => {
    const { user } = renderExplorer({ url: '/?dataset=large' })
    // The first top-level folder; after `*` its children may have the same name.
    const assets = await findItem('Assets')
    const backups = getItem('Backups')
    screen.getByRole('tree').focus()
    await user.keyboard('*')
    const tree = screen.getByRole('tree')
    fireEvent.dragStart(assets, { dataTransfer: dataTransfer() })
    expect(assets.className).toContain('opacity-40')

    // Scroll a few thousand pixels down: the first rows leave the virtual window.
    Object.defineProperty(tree, 'scrollTop', { configurable: true, value: 5000 })
    fireEvent.scroll(tree)
    await waitFor(() => expect(backups).not.toBeInTheDocument())
    expect(assets).toBeInTheDocument()

    // Its dragend still arrives, so the drag state is cleared.
    fireEvent.dragEnd(assets, { dataTransfer: dataTransfer() })
    expect(assets.className).not.toContain('opacity-40')
  })

  it('ignores drag events that did not start in the tree', async () => {
    await renderLoaded()
    expect(fireEvent.dragOver(getItem('Drafts'), { dataTransfer: dataTransfer() })).toBe(true)
  })
})
