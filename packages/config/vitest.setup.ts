import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// jsdom has no layout. TanStack Virtual measures its scroll element and observes resizes, so give
// every element a viewport-sized box: about 20 rows of the tree are then "on screen".
class ResizeObserverMock {
  callback: ResizeObserverCallback
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver

Object.defineProperties(HTMLElement.prototype, {
  offsetHeight: { configurable: true, get: () => 640 },
  offsetWidth: { configurable: true, get: () => 800 },
  clientHeight: { configurable: true, get: () => 640 },
})
HTMLElement.prototype.getBoundingClientRect = function () {
  return { x: 0, y: 0, top: 0, left: 0, bottom: 640, right: 800, width: 800, height: 640, toJSON() {} }
}
Element.prototype.scrollTo = function () {} as typeof Element.prototype.scrollTo
Element.prototype.scrollIntoView = function () {}
// Used by sonner's swipe-to-dismiss.
Element.prototype.setPointerCapture = function () {}
Element.prototype.releasePointerCapture = function () {}
Element.prototype.hasPointerCapture = () => false

window.matchMedia ??= (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})
