import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ProgressBar } from '../../components/ProgressBar'
import type { PracticeMode } from '../../types/quiz'
import { ReadingScaleButton } from '../settings/ReadingScaleControl'

type PracticeHeaderProps = {
  setId: string
  title: string
  mode: PracticeMode
  index: number
  total: number
  answered: number
  correct: number
  onOpenReadingScale: () => void
}

export function PracticeHeader({
  setId,
  title,
  mode,
  index,
  total,
  answered,
  correct,
  onOpenReadingScale,
}: PracticeHeaderProps) {
  const modeLabel = mode === 'random' ? '隨機' : '依序'

  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-line bg-paper lg:hidden">
      <div className="flex h-16 items-center gap-2 px-4 sm:px-6">
        <Link
          to={`/sets/${setId}`}
          aria-label="返回題庫"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate font-serif text-base leading-tight text-ink">{title}</p>
            <span
              title={mode === 'random' ? '隨機模式' : '依序模式'}
              className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[10px] leading-4 tracking-[0.08em] text-muted"
            >
              {modeLabel}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-muted">
            第 {index + 1} / {total} 題
            <span aria-hidden="true"> · </span>
            答對 {correct}
          </p>
        </div>
        <ReadingScaleButton onClick={onOpenReadingScale} className="ring-offset-paper" />
      </div>
      <div className="px-4 pb-2 sm:px-6">
        <ProgressBar answered={answered} total={total} compact />
      </div>
    </header>
  )
}
