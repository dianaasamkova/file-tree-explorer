import { Scissors } from 'lucide-react'
import { Kbd, MOD_KEY } from '@fte/ui'
import { useDebouncedValue } from '../lib/use-debounced-value'
import { pluralize } from '../model/format'
import type { TreeNode } from '../model/types'

export interface StatusBarProps {
  total: number | null
  matches: number | null
  query: string
  cutNode: TreeNode | undefined
}

/** How long typing must pause before a new count is announced to screen readers. */
export const ANNOUNCE_DELAY = 500

export function StatusBar({ total, matches, query, cutNode }: StatusBarProps) {
  const summary =
    total === null
      ? 'Loading…'
      : matches === null
        ? pluralize(total, 'item')
        : `${pluralize(matches, 'match', 'matches')} for “${query.trim()}” in ${pluralize(total, 'item')}`
  // The count on screen follows every keystroke. Screen readers get it once typing pauses,
  // instead of one announcement per letter.
  const announcement = useDebouncedValue(summary, ANNOUNCE_DELAY)

  return (
    <footer className="border-border bg-surface text-muted flex min-h-9 flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t px-4 py-1.5 text-xs">
      <p aria-hidden className="tabular-nums">
        {summary}
      </p>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {cutNode ? (
        <p className="text-foreground flex items-center gap-1.5">
          <Scissors aria-hidden className="size-3.5" />
          <span>
            “{cutNode.name}” is ready to move. Focus a folder and press <Kbd>{MOD_KEY}</Kbd> <Kbd>V</Kbd>, or{' '}
            <Kbd>Esc</Kbd> to cancel.
          </span>
        </p>
      ) : (
        <p className="hidden items-center gap-1.5 sm:flex">
          Move items by dragging them onto a folder, or with <Kbd>{MOD_KEY}</Kbd> <Kbd>X</Kbd> and <Kbd>{MOD_KEY}</Kbd>{' '}
          <Kbd>V</Kbd>
        </p>
      )}
    </footer>
  )
}
