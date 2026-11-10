import { Button, colorTokens, Kbd, MOD_KEY, Skeleton } from '@fte/ui'
import { FolderOpen, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * Every token and component of the design system in each state, rendered with the real
 * components, so a change to `@fte/ui` is visible here in both themes before it reaches a feature.
 */
export function DesignSystemPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-12 px-4 py-10 md:px-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-tight text-balance">Design system</h2>
        <p className="text-muted max-w-prose">
          The tokens and components in <code className="text-foreground">@fte/ui</code>. Switch the theme in the header:
          every colour is a role with a light and a dark value.
        </p>
      </div>

      <Section title="Colour roles">
        <ul className="grid gap-3 sm:grid-cols-2">
          {colorTokens.map(({ name, role }) => (
            <li key={name} className="flex items-center gap-3">
              <span
                aria-hidden
                className="border-border size-10 shrink-0 rounded-md border"
                style={{ background: `var(--${name})` }}
              />
              <span className="min-w-0">
                <code className="text-sm font-medium">--{name}</code>
                <span className="text-muted block text-sm">{role}</span>
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Type">
        <dl className="grid grid-cols-[7rem_1fr] items-baseline gap-x-6 gap-y-4">
          <dt className="text-muted text-sm">Title, 18 px</dt>
          <dd className="text-lg font-semibold">Invoice 2026-09.pdf</dd>
          <dt className="text-muted text-sm">Brand, 15 px</dt>
          <dd className="text-[15px] font-semibold tracking-tight">File Tree Explorer</dd>
          <dt className="text-muted text-sm">Body, 14 px</dt>
          <dd className="text-sm">Select a file or folder to see its size, location and actions.</dd>
          <dt className="text-muted text-sm">Small, 12 px</dt>
          <dd className="text-muted text-xs tabular-nums">Modified Sep 30, 2026, 12:00 PM UTC</dd>
        </dl>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-col gap-4">
          {(['primary', 'outline', 'ghost', 'link'] as const).map((variant) => (
            <div key={variant} className="flex flex-wrap items-center gap-3">
              <span className="text-muted w-20 text-sm">{variant}</span>
              <Button variant={variant} size="sm">
                Small
              </Button>
              <Button variant={variant}>Medium</Button>
              <Button variant={variant}>
                <RefreshCw />
                With icon
              </Button>
              <Button variant={variant} disabled>
                Disabled
              </Button>
              <Button variant={variant} size="icon" aria-label={`Open folder (${variant})`}>
                <FolderOpen />
              </Button>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Keyboard keys">
        <p className="flex flex-wrap items-center gap-1.5 text-sm">
          Cut and paste with <Kbd>{MOD_KEY}</Kbd> <Kbd>X</Kbd> and <Kbd>{MOD_KEY}</Kbd> <Kbd>V</Kbd>; search with{' '}
          <Kbd>/</Kbd>; cancel with <Kbd>Esc</Kbd>.
        </p>
      </Section>

      <Section title="Loading">
        <div aria-hidden className="flex max-w-sm flex-col gap-2">
          {[60, 45, 70].map((width) => (
            <div key={width} className="flex items-center gap-2">
              <Skeleton className="size-4" />
              <Skeleton className="h-3.5" style={{ width: `${width}%` }} />
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h3 className="border-border border-b pb-2 text-base font-semibold">{title}</h3>
      {children}
    </section>
  )
}
