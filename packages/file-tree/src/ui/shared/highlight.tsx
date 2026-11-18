import type { ReactNode } from 'react'

/** Wraps every case-insensitive occurrence of `query` in <mark>. */
export function Highlight({ text, query }: { text: string; query: string }) {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return <>{text}</>

  const haystack = text.toLocaleLowerCase()
  const parts: ReactNode[] = []
  let from = 0
  for (let index = haystack.indexOf(needle); index !== -1; index = haystack.indexOf(needle, from)) {
    if (index > from) parts.push(text.slice(from, index))
    parts.push(
      <mark key={index} className="bg-mark text-mark-foreground rounded-[3px]">
        {text.slice(index, index + needle.length)}
      </mark>,
    )
    from = index + needle.length
  }
  if (from < text.length) parts.push(text.slice(from))
  return <>{parts}</>
}
