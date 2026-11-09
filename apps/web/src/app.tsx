import { Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { Toaster } from 'sonner'
import { datasets, FileTreeExplorer, isDatasetId, TREE_ID, useUrlState, type DatasetId } from '@fte/file-tree'
import { Button, buttonVariants, cn } from '@fte/ui'
import { DesignSystemPage } from './design-system-page'
import { useHashRoute } from './hooks/use-hash-route'
import { useTheme } from './hooks/use-theme'

const urlKeys = ['dataset', 'file'] as const

export function App() {
  const { theme, toggleTheme } = useTheme()
  const showDesignSystem = useHashRoute() === 'design-system'
  const [initialUrl, writeUrl] = useUrlState(urlKeys)
  const [dataset, setDataset] = useState<DatasetId>(isDatasetId(initialUrl.dataset) ? initialUrl.dataset : 'sample')

  const changeDataset = (next: DatasetId) => {
    if (next === dataset) return
    // The selection and search belong to the old drive; the explorer remounts and reads the URL.
    writeUrl({ dataset: next === 'sample' ? null : next, file: null })
    setDataset(next)
  }

  return (
    <div className="bg-background text-foreground flex min-h-full flex-col font-sans antialiased md:h-full">
      <a
        href={`#${TREE_ID}`}
        className="bg-accent text-accent-foreground sr-only z-50 rounded-md px-3 py-2 text-sm font-medium focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        Skip to files
      </a>
      <header className="border-border bg-surface flex h-14 shrink-0 items-center gap-3 border-b px-4">
        <Logo />
        <h1 className="text-[15px] font-semibold tracking-tight max-sm:sr-only">File Tree Explorer</h1>
        <div className="ml-auto flex items-center gap-2">
          <a
            href={showDesignSystem ? '#' : '#design-system'}
            className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'max-sm:hidden' })}
          >
            {showDesignSystem ? 'Explorer' : 'Design system'}
          </a>
          <div role="group" aria-label="Drive" className="bg-background border-border flex rounded-lg border p-0.5">
            {(Object.keys(datasets) as DatasetId[]).map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={dataset === id}
                title={datasets[id].description}
                onClick={() => changeDataset(id)}
                className={cn(
                  'h-7 cursor-pointer rounded-md px-2.5 text-xs font-medium whitespace-nowrap transition-colors',
                  dataset === id ? 'bg-surface text-foreground shadow-sm' : 'text-muted hover:text-foreground',
                )}
              >
                {datasets[id].label}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? <Sun /> : <Moon />}
          </Button>
        </div>
      </header>
      <main className={cn('flex min-h-0 flex-1 flex-col', showDesignSystem && 'overflow-y-auto')}>
        {showDesignSystem ? <DesignSystemPage /> : <FileTreeExplorer key={dataset} dataset={dataset} />}
      </main>
      <Toaster
        theme={theme}
        position="bottom-right"
        offset={{ bottom: 52, right: 16 }}
        toastOptions={{
          classNames: {
            toast: '!bg-surface-raised !border-border !text-foreground !font-sans',
            description: '!text-muted',
            actionButton: '!bg-accent !text-accent-foreground',
            error: '[&_[data-icon]]:!text-danger',
            success: '[&_[data-icon]]:!text-accent',
          },
        }}
      />
    </div>
  )
}

/** A folder tab drawn as a branch: the product in one glyph. */
function Logo() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" strokeWidth="1.75" strokeLinecap="round">
      <path
        d="M3 7.5V18a1.5 1.5 0 0 0 1.5 1.5h15A1.5 1.5 0 0 0 21 18V9a1.5 1.5 0 0 0-1.5-1.5h-7L10.5 5h-6A1.5 1.5 0 0 0 3 6.5Z"
        className="stroke-folder fill-folder/15"
      />
      <path d="M8 11v5h3M8 13.5h3" className="stroke-accent" />
    </svg>
  )
}
