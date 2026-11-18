import { Button, Skeleton } from '@fte/ui'
import { FolderSearch, RefreshCw, TriangleAlert } from 'lucide-react'

/** Placeholder rows while the drive loads. */
export function LoadingState() {
  return (
    <div aria-busy="true" className="flex flex-col gap-2 p-3">
      <span className="sr-only">Loading files…</span>
      {[40, 55, 35, 62, 48, 30, 52, 44].map((width, index) => (
        <div key={index} className="flex h-6 items-center gap-2" style={{ paddingLeft: index % 3 === 2 ? 26 : 6 }}>
          <Skeleton className="size-4" />
          <Skeleton className="h-3.5" style={{ width: `${width}%` }} />
        </div>
      ))}
    </div>
  )
}

/** Shown only when nothing has loaded. Retrying puts the query back to pending, which shows the skeleton. */
export function ErrorState({ message, onRetry }: { message: string; onRetry(): void }) {
  return (
    <div role="alert" className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <TriangleAlert aria-hidden className="text-danger size-6" />
      <div>
        <p className="font-medium">Couldn't load files</p>
        <p className="text-muted mt-1 text-sm">{message}</p>
      </div>
      <Button onClick={onRetry}>
        <RefreshCw />
        Retry
      </Button>
    </div>
  )
}

export function EmptyState({ query, onClear }: { query: string | null; onClear(): void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <FolderSearch aria-hidden className="text-muted size-6" />
      {query === null ? (
        <p className="font-medium">This drive is empty</p>
      ) : (
        <>
          <div>
            <p className="font-medium">No files or folders match “{query.trim()}”</p>
            <p className="text-muted mt-1 text-sm">Check the spelling, or search for part of a name.</p>
          </div>
          <Button onClick={onClear}>Clear search</Button>
        </>
      )}
    </div>
  )
}
