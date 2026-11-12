import { Check, X } from 'lucide-react'
import { cn } from '../lib/cn'
import type { QuizOption } from '../types/quiz'

export type OptionStatus = 'idle' | 'selected' | 'correct' | 'wrong' | 'missed'

type OptionButtonProps = {
  option: QuizOption
  selected: boolean
  status: OptionStatus
  disabled?: boolean
  multi: boolean
  onClick: () => void
}

export function OptionButton({
  option,
  selected,
  status,
  disabled = false,
  multi,
  onClick,
}: OptionButtonProps) {
  const isCorrect = status === 'correct' || status === 'missed'
  const isWrong = status === 'wrong'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={multi ? selected : undefined}
      role={multi ? undefined : 'radio'}
      aria-checked={multi ? undefined : selected}
      className={cn(
        'group flex min-h-14 w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-default',
        status === 'idle' && 'border-line bg-surface hover:border-accent/60 hover:bg-paper',
        status === 'selected' && 'border-accent bg-accent-soft',
        isCorrect && 'border-correct bg-correct-soft',
        isWrong && 'border-wrong bg-wrong-soft',
      )}
    >
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border font-mono text-xs font-semibold',
          isCorrect
            ? 'border-correct/40 bg-surface text-correct'
            : isWrong
              ? 'border-wrong/40 bg-surface text-wrong'
              : status === 'selected'
                ? 'border-accent/40 bg-surface text-accent'
                : 'border-line bg-paper text-muted',
        )}
      >
        {option.key}
      </span>
      <span className="min-w-0 flex-1 text-sm leading-6 text-ink">{option.text}</span>
      {isCorrect && <Check className="h-4 w-4 shrink-0 text-correct" aria-hidden="true" />}
      {isWrong && <X className="h-4 w-4 shrink-0 text-wrong" aria-hidden="true" />}
    </button>
  )
}
