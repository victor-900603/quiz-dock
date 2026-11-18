import { useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, ListChecks } from 'lucide-react'
import { Button } from '../../components/Button'

type DesktopQuestionToolbarProps = {
  index: number
  total: number
  navigatorOpen: boolean
  onPrevious: () => void
  onNext: () => void
  onToggleNavigator: () => void
}

export function DesktopQuestionToolbar({
  index,
  total,
  navigatorOpen,
  onPrevious,
  onNext,
  onToggleNavigator,
}: DesktopQuestionToolbarProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const displayNumber = Math.min(index + 1, total)

  useEffect(() => {
    if (!navigatorOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onToggleNavigator()
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (containerRef.current?.contains(target)) return
      if (target.closest('[data-question-navigator]')) return
      onToggleNavigator()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('pointerdown', handlePointerDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [navigatorOpen, onToggleNavigator])

  return (
    <div ref={containerRef} className="fixed bottom-5 right-5 z-30 hidden lg:block">
      <div
        id="desktop-question-toolbar"
        className="inline-flex items-center gap-1 rounded-full border border-line bg-surface p-1 shadow-card"
      >
        <Button
          variant="ghost"
          onClick={onPrevious}
          disabled={index <= 0}
          aria-label="前一題"
          title="前一題"
          className="min-h-9 w-9 rounded-full px-0 text-muted hover:bg-paper hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Button>

        <button
          type="button"
          onClick={onToggleNavigator}
          aria-label={`練習工具列，第 ${displayNumber} / ${total} 題${navigatorOpen ? '，題號列表已展開' : ''}`}
          aria-expanded={navigatorOpen}
          aria-controls="question-navigator-panel"
          className="inline-flex min-h-9 items-center gap-2 rounded-full bg-accent-soft px-3 text-sm font-medium text-accent transition-colors hover:bg-accent-soft/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          <ListChecks className="h-4 w-4" aria-hidden="true" />
          <span className="font-mono text-xs font-normal text-accent/80">
            {displayNumber}/{total}
          </span>
        </button>

        <Button
          variant="ghost"
          onClick={onNext}
          disabled={index >= total - 1}
          aria-label="後一題"
          title="後一題"
          className="min-h-9 w-9 rounded-full px-0 text-muted hover:bg-paper hover:text-ink"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
