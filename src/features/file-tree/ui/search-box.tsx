import { Search, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Kbd } from '@/components/ui/kbd'

export interface SearchBoxProps {
  value: string
  onChange(value: string): void
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))

export function SearchBox({ value, onChange }: SearchBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  // "/" focuses the search from anywhere, as on GitHub and in many file managers.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return
      event.preventDefault()
      inputRef.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="relative">
      <Search
        aria-hidden
        className="text-muted pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
      />
      <input
        ref={inputRef}
        type="search"
        aria-label="Search files and folders"
        placeholder="Search by name"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && value) {
            event.preventDefault()
            onChange('')
          }
        }}
        className="border-border bg-surface placeholder:text-muted focus-visible:border-accent h-9 w-full rounded-md border pr-9 pl-8 text-sm outline-offset-0 [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            onChange('')
            inputRef.current?.focus()
          }}
          className="text-muted hover:text-foreground hover:bg-hover absolute top-1/2 right-1.5 grid size-6 -translate-y-1/2 cursor-pointer place-items-center rounded"
        >
          <X className="size-4" />
        </button>
      ) : (
        <Kbd aria-hidden className="absolute top-1/2 right-2 -translate-y-1/2">
          /
        </Kbd>
      )}
    </div>
  )
}
