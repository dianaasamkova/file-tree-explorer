import { useSyncExternalStore } from 'react'

const subscribe = (onChange: () => void) => {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

/** The page named in the URL's hash (`#design-system`), so each page has a link of its own. */
export function useHashRoute(): string {
  return useSyncExternalStore(subscribe, () => window.location.hash.slice(1))
}
