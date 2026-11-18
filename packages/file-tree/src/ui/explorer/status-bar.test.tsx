import { act, render, screen } from '@testing-library/react'
import { ANNOUNCE_DELAY, StatusBar } from './status-bar'

describe('StatusBar', () => {
  it('updates the visible count at once and announces it once typing pauses', () => {
    vi.useFakeTimers()
    const { container, rerender } = render(<StatusBar total={47} matches={null} query="" cutNode={undefined} />)
    const visible = () => container.querySelector('p[aria-hidden]')
    expect(screen.getByRole('status')).toHaveTextContent('47 items')

    rerender(<StatusBar total={47} matches={5} query="k" cutNode={undefined} />)
    rerender(<StatusBar total={47} matches={2} query="ki" cutNode={undefined} />)
    expect(visible()).toHaveTextContent('2 matches for “ki” in 47 items')
    expect(screen.getByRole('status')).toHaveTextContent('47 items')

    act(() => vi.advanceTimersByTime(ANNOUNCE_DELAY))
    expect(screen.getByRole('status')).toHaveTextContent('2 matches for “ki” in 47 items')
  })
})
