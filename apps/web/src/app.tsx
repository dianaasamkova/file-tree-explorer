import { useState } from 'react'
import { Toaster } from 'sonner'
import { FileTreeExplorer, isDatasetId, TREE_ID, useUrlState, type DatasetId } from '@fte/file-tree'
import { cn } from '@fte/ui'
import { AppHeader } from './components/app-header'
import { DesignSystemPage } from './pages/design-system-page'
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
      <AppHeader
        theme={theme}
        onToggleTheme={toggleTheme}
        dataset={dataset}
        onDatasetChange={changeDataset}
        showDesignSystem={showDesignSystem}
      />
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
