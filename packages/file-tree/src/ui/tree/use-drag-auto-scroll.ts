import { useCallback, useEffect, useRef, type RefObject } from 'react'

/** Height of the band at the top and bottom edge where dragging scrolls the list. */
export const AUTO_SCROLL_EDGE = 56
/** Fastest scroll, in pixels per frame, when the pointer is right at the edge. */
export const AUTO_SCROLL_MAX_SPEED = 18

/**
 * Scroll speed for a pointer at `y` inside a box from `top` to `bottom`: negative scrolls up,
 * positive scrolls down, 0 outside the edge bands. It grows the closer the pointer gets to the edge.
 */
export function getAutoScrollSpeed(y: number, top: number, bottom: number): number {
  const edge = Math.min(AUTO_SCROLL_EDGE, (bottom - top) / 3)
  if (y < top + edge) return -Math.ceil(AUTO_SCROLL_MAX_SPEED * Math.min(1, (top + edge - y) / edge))
  if (y > bottom - edge) return Math.ceil(AUTO_SCROLL_MAX_SPEED * Math.min(1, (y - (bottom - edge)) / edge))
  return 0
}

/**
 * Browsers don't scroll an overflow container during a native drag, and most ignore the wheel
 * then too. Call `update` from `dragover` (it fires continuously while the pointer is over the
 * element, even when it doesn't move) and `stop` when the drag ends.
 */
export function useDragAutoScroll(scrollRef: RefObject<HTMLElement | null>) {
  const speed = useRef(0)
  const frame = useRef<number | null>(null)

  const stop = useCallback(() => {
    speed.current = 0
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = null
  }, [])

  const update = useCallback(
    (clientY: number) => {
      const element = scrollRef.current!
      const { top, bottom } = element.getBoundingClientRect()
      speed.current = getAutoScrollSpeed(clientY, top, bottom)
      if (speed.current === 0 || frame.current !== null) return
      const step = () => {
        if (speed.current === 0) {
          frame.current = null
          return
        }
        element.scrollTop += speed.current
        frame.current = requestAnimationFrame(step)
      }
      frame.current = requestAnimationFrame(step)
    },
    [scrollRef],
  )

  useEffect(() => stop, [stop])

  return { update, stop }
}
