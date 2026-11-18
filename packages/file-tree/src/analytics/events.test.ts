import { setTracker, track } from './events'

describe('track', () => {
  it('logs events in development only, and can be sent elsewhere', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {})
    track({ name: 'item_moved', method: 'drag' })
    expect(debug).not.toHaveBeenCalled()

    vi.stubEnv('MODE', 'development')
    track({ name: 'item_moved', method: 'drag' })
    expect(debug).toHaveBeenCalledWith('[track]', { name: 'item_moved', method: 'drag' })
    vi.unstubAllEnvs()

    const sink = vi.fn()
    const restore = setTracker(sink)
    track({ name: 'search_settled', queryLength: 3, matches: 0 })
    expect(sink).toHaveBeenCalledWith({ name: 'search_settled', queryLength: 3, matches: 0 })
    restore()
    track({ name: 'item_moved', method: 'picker' })
    expect(sink).toHaveBeenCalledTimes(1)
  })
})
