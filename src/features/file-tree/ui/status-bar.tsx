import { Scissors } from 'lucide-react'
import { Kbd } from '@/components/ui/kbd'
import { MOD_KEY } from '@/lib/platform'
import { pluralize } from '../model/format'
import type { TreeNode } from '../model/types'

export interface StatusBarProps {
  total: number | null
  matches: number | null
  query: string
  cutNode: TreeNode | undefined
}

export function StatusBar({ total, matches, query, cutNode }: StatusBarProps) {
  return (
    <footer className="border-border bg-surface text-muted flex min-h-9 flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t px-4 py-1.5 text-xs">
      {/* Announced to screen readers whenever the count changes. */}
      <p role="status" aria-live="polite" className="tabular-nums">
        {total === null
          ? 'Loading…'
          : matches === null
            ? pluralize(total, 'item')
            : `${pluralize(matches, 'match', 'matches')} for “${query.trim()}” in ${pluralize(total, 'item')}`}
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
