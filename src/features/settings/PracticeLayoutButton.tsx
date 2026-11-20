import { Columns2, Rows2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import { togglePracticeLayout, usePracticeLayout } from './practiceLayout'

type PracticeLayoutButtonProps = {
  className?: string
}

export function PracticeLayoutButton({ className }: PracticeLayoutButtonProps) {
  const layout = usePracticeLayout()
  const split = layout === 'split'
  const Icon = split ? Rows2 : Columns2

  return (
    <button
      type="button"
      onClick={togglePracticeLayout}
      aria-label="左右版面"
      aria-pressed={split}
      title={split ? '切換為上下版面' : '切換為左右版面'}
      className={cn(
        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-card transition-colors hover:border-accent/60 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        className,
      )}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </button>
  )
}
