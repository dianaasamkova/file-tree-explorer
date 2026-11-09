import type { ComponentProps } from 'react'
import { cn } from './cn'

export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return <div aria-hidden className={cn('bg-hover animate-pulse rounded', className)} {...props} />
}
