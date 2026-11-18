import { Check } from 'lucide-react'
import { cn } from '../lib/cn'
import type { QuizOption } from '../types/quiz'

type AnswerReviewProps = {
  options: QuizOption[]
  correctAnswers: string[]
  explanation: string
  className?: string
}

export function AnswerReview({
  options,
  correctAnswers,
  explanation,
  className,
}: AnswerReviewProps) {
  return (
    <div className={className}>
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">選項</p>
      <ol className="mt-3 space-y-2">
        {options.map((option) => {
          const isAnswer = correctAnswers.includes(option.key)

          return (
            <li
              key={option.key}
              className={cn(
                'flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm leading-6',
                isAnswer
                  ? 'border-correct/40 bg-correct-soft'
                  : 'border-line bg-surface',
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border font-mono text-xs font-semibold',
                  isAnswer
                    ? 'border-correct bg-correct text-surface'
                    : 'border-line bg-paper text-muted',
                )}
                aria-hidden="true"
              >
                {option.key}
              </span>
              <span className="min-w-0 flex-1 text-ink">{option.text}</span>
              {isAnswer && (
                <span className="inline-flex shrink-0 items-center gap-1 pt-0.5 text-xs font-medium text-correct">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  正確答案
                </span>
              )}
            </li>
          )
        })}
      </ol>
      <div className="mt-4 rounded-lg border border-line bg-surface p-4">
        <p className="text-xs text-muted">解析</p>
        <p className="mt-2 whitespace-pre-line text-sm leading-7 text-ink">
          {explanation || '本題沒有解析'}
        </p>
      </div>
    </div>
  )
}
