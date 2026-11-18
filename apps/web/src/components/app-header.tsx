import { datasets, type DatasetId } from '@fte/file-tree'
import { Button, buttonVariants, cn } from '@fte/ui'
import { Moon, Sun } from 'lucide-react'
import type { Theme } from '../hooks/use-theme'

export interface AppHeaderProps {
  theme: Theme
  onToggleTheme(): void
  dataset: DatasetId
  onDatasetChange(dataset: DatasetId): void
  /** The design system page is open: the link leads back to the explorer. */
  showDesignSystem: boolean
}

/** Product name, page link, drive switch and theme toggle. */
export function AppHeader({ theme, onToggleTheme, dataset, onDatasetChange, showDesignSystem }: AppHeaderProps) {
  return (
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
              onClick={() => onDatasetChange(id)}
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
          onClick={onToggleTheme}
        >
          {theme === 'dark' ? <Sun /> : <Moon />}
        </Button>
      </div>
    </header>
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
