import { screen } from '@testing-library/react'
import { findItem, renderApp, searchParam } from '@/test/render'

describe('App', () => {
  it('has a skip link to the tree', async () => {
    renderApp()
    expect(screen.getByRole('link', { name: 'Skip to files' })).toHaveAttribute('href', '#file-tree')
    expect(screen.getByRole('heading', { level: 1, name: 'File Tree Explorer' })).toBeInTheDocument()
    await findItem('Clients')
  })

  it('toggles and remembers the theme', async () => {
    const { user } = renderApp()
    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }))
    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem('theme')).toBe('dark')

    await user.click(screen.getByRole('button', { name: 'Switch to light theme' }))
    expect(document.documentElement).not.toHaveClass('dark')
    expect(localStorage.getItem('theme')).toBe('light')
  })

  it('keeps the theme working when storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const { user } = renderApp()
    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }))
    expect(document.documentElement).toHaveClass('dark')
  })

  it('switches to the 10,000-item drive and renders only the rows on screen', async () => {
    const { user } = renderApp({ url: '/?file=welcome-md' })
    await findItem('Clients')
    await user.click(screen.getByRole('button', { name: '10,000 items' }))

    expect(screen.getByRole('button', { name: '10,000 items' })).toHaveAttribute('aria-pressed', 'true')
    expect(await screen.findByText('10,000 items', { selector: '[role=status]' })).toBeInTheDocument()
    expect(searchParam('dataset')).toBe('large')
    expect(searchParam('file')).toBeNull()

    screen.getByRole('tree').focus()
    await user.keyboard('*')
    expect(screen.getAllByRole('treeitem').length).toBeLessThan(60)

    await user.click(screen.getByRole('button', { name: 'Sample drive' }))
    await findItem('Clients')
    expect(searchParam('dataset')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Sample drive' }))
  })

  it('opens the drive named in the URL', async () => {
    renderApp({ url: '/?dataset=large' })
    expect(await screen.findByText('10,000 items', { selector: '[role=status]' })).toBeInTheDocument()
  })
})
