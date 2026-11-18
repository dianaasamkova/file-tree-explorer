import { AUTO_SCROLL_EDGE, AUTO_SCROLL_MAX_SPEED, getAutoScrollSpeed } from './use-drag-auto-scroll'

describe('getAutoScrollSpeed', () => {
  const [top, bottom] = [100, 700]

  it('does not scroll away from the edges', () => {
    expect(getAutoScrollSpeed(400, top, bottom)).toBe(0)
    expect(getAutoScrollSpeed(top + AUTO_SCROLL_EDGE, top, bottom)).toBe(0)
    expect(getAutoScrollSpeed(bottom - AUTO_SCROLL_EDGE, top, bottom)).toBe(0)
  })

  it('scrolls up near the top and down near the bottom, faster closer to the edge', () => {
    expect(getAutoScrollSpeed(top + AUTO_SCROLL_EDGE / 2, top, bottom)).toBe(-AUTO_SCROLL_MAX_SPEED / 2)
    expect(getAutoScrollSpeed(top, top, bottom)).toBe(-AUTO_SCROLL_MAX_SPEED)
    expect(getAutoScrollSpeed(bottom - AUTO_SCROLL_EDGE / 2, top, bottom)).toBe(AUTO_SCROLL_MAX_SPEED / 2)
    expect(getAutoScrollSpeed(bottom, top, bottom)).toBe(AUTO_SCROLL_MAX_SPEED)
  })

  it('never goes past the top speed, even outside the box', () => {
    expect(getAutoScrollSpeed(top - 50, top, bottom)).toBe(-AUTO_SCROLL_MAX_SPEED)
    expect(getAutoScrollSpeed(bottom + 50, top, bottom)).toBe(AUTO_SCROLL_MAX_SPEED)
  })

  it('keeps the edge bands small in a short box', () => {
    // A 90 px box gets 30 px bands, so its middle still doesn't scroll.
    expect(getAutoScrollSpeed(145, 100, 190)).toBe(0)
    expect(getAutoScrollSpeed(100, 100, 190)).toBe(-AUTO_SCROLL_MAX_SPEED)
  })
})
