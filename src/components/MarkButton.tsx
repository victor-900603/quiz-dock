import { Star } from 'lucide-react'
import { cn } from '../lib/cn'

type MarkButtonProps = {
  marked: boolean
  onToggle: () => void
  className?: string
}

export function MarkButton({ marked, onToggle, className }: MarkButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={marked}
      aria-label={marked ? '取消標記' : '標記題目'}
      title={marked ? '取消標記' : '標記題目'}
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-150 hover:bg-highlight-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        marked && 'text-highlight',
        className,
      )}
    >
      <Star className="h-5 w-5" fill={marked ? 'currentColor' : 'none'} aria-hidden="true" />
    </button>
  )
}
