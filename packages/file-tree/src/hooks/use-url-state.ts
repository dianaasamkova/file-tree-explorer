import { useCallback, useState } from 'react'

function readParams<K extends string>(keys: readonly K[]): Record<K, string | null> {
  const search = new URLSearchParams(window.location.search)
  return Object.fromEntries(keys.map((key) => [key, search.get(key)])) as Record<K, string | null>
}

/**
 * Mirrors a few values to the query string, so a view can be shared as a link. It uses
 * `replaceState`: typing a search should not fill the browser history with entries.
 */
export function useUrlState<K extends string>(keys: readonly K[]) {
  const [params] = useState(() => readParams(keys))

  const write = useCallback((values: Partial<Record<K, string | null>>) => {
    const url = new URL(window.location.href)
    for (const [key, value] of Object.entries(values) as [K, string | null | undefined][]) {
      if (value) url.searchParams.set(key, value)
      else url.searchParams.delete(key)
    }
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url)
  }, [])

  return [params, write] as const
}
