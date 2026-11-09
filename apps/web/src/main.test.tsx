import { screen } from '@testing-library/react'

describe('main', () => {
  it('mounts the app into #root with the latency from the URL', async () => {
    window.history.replaceState(null, '', '/?latency=0')
    const root = document.createElement('div')
    root.id = 'root'
    document.body.append(root)

    await import('./main')

    expect(await screen.findByRole('treeitem', { name: /^Clients/ })).toBeInTheDocument()
    expect(root).toContainElement(screen.getByRole('tree'))
  })
})
