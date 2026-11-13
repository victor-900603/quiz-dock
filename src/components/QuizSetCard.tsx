import { BookOpen, Clock3, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { buttonStyles } from './Button'
import { Card } from './Card'
import { formatPercentValue, formatShortDateTime } from '../lib/format'
import type { PracticeProgress, QuizSet } from '../types/quiz'

type QuizSetCardProps = {
  set: QuizSet
  markedCount: number
  progress?: PracticeProgress
  practicePending?: boolean
  onPractice?: () => void
}

export function QuizSetCard({
  set,
  markedCount,
  progress,
  practicePending = false,
  onPractice,
}: QuizSetCardProps) {
  const accuracy =
    progress && progress.answered > 0
      ? (progress.correct / progress.answered) * 100
      : set.accuracy
  const statusLabel = progress
    ? progress.status === 'completed'
      ? '已完成'
      : '進行中'
    : '未開始'
  const practiceHref = progress
    ? progress.status === 'completed'
      ? `/results/${progress.id}`
      : `/practice/${progress.id}?setId=${set.id}&mode=${progress.mode}`
    : null

  return (
    <Card className="flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={`/sets/${set.id}`}
            className="font-serif text-xl leading-snug text-ink hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            {set.title}
          </Link>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{set.description}</p>
        </div>
        <span className="shrink-0 rounded-full border border-line bg-paper px-2 py-1 font-mono text-[11px] text-muted">
          {set.questionCount} 題
        </span>
      </div>

      <dl className="mt-5 grid grid-cols-3 divide-x divide-line border-y border-line py-3 text-center">
        <div>
          <dt className="text-[10px] uppercase tracking-[0.12em] text-muted">題數</dt>
          <dd className="mt-1 font-mono text-sm text-ink">{set.questionCount}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-[0.12em] text-muted">主題</dt>
          <dd className="mt-1 font-mono text-sm text-ink">{set.topicCount}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-[0.12em] text-muted">正確率</dt>
          <dd className="mt-1 font-mono text-sm text-ink">{formatPercentValue(accuracy)}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Star className="h-3.5 w-3.5" aria-hidden="true" />
          {markedCount} 個標記
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
          {progress
            ? formatShortDateTime(progress.updatedAt)
            : set.lastPracticedLabel ?? '尚未練習'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
          {statusLabel}
        </span>
      </div>

      <div className="mt-auto flex items-center gap-2 pt-5">
        {practiceHref ? (
          <Link to={practiceHref} className={buttonStyles('primary', 'min-h-10 px-3')}>
            {progress?.status === 'completed' ? '查看摘要' : '繼續練習'}
          </Link>
        ) : (
          <button
            type="button"
            onClick={onPractice}
            disabled={!onPractice || practicePending || set.questionCount === 0}
            title={set.questionCount === 0 ? '此題庫沒有題目' : undefined}
            className={buttonStyles(
              'primary',
              'min-h-10 px-3 disabled:cursor-not-allowed disabled:opacity-60',
            )}
          >
            {practicePending ? '開始中...' : '開始練習'}
          </button>
        )}
        <Link to={`/sets/${set.id}`} className={buttonStyles('secondary', 'min-h-10 px-3')}>
          詳情
        </Link>
      </div>
    </Card>
  )
}
