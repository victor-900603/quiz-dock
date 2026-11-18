import { cn } from '../lib/cn'

type SkeletonProps = {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse rounded bg-line/60 motion-reduce:animate-none',
        className,
      )}
    />
  )
}
