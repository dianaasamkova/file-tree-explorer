import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

export function Kbd({ className, ...props }: ComponentProps<'kbd'>) {
  return (
    <kbd
      className={cn(
        'border-border bg-surface text-muted inline-flex h-5 min-w-5 items-center justify-center rounded border px-1 font-sans text-[11px] font-medium',
        className,
      )}
      {...props}
    />
  )
}
