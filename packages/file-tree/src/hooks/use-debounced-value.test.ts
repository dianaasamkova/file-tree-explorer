import { act, renderHook } from '@testing-library/react'
import { useDebouncedValue } from './use-debounced-value'

describe('useDebouncedValue', () => {
  it('returns the first value at once and later ones after a pause', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 500), {
      initialProps: { value: 'a' },
    })
    expect(result.current).toBe('a')

    rerender({ value: 'ab' })
    act(() => vi.advanceTimersByTime(300))
    rerender({ value: 'abc' })
    act(() => vi.advanceTimersByTime(300))
    // 'ab' never shows: 'abc' arrived before its pause was over.
    expect(result.current).toBe('a')

    act(() => vi.advanceTimersByTime(200))
    expect(result.current).toBe('abc')
  })
})
