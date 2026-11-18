import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { copyText } from '../lib/clipboard'
import { cn } from '../lib/cn'
import { formatQuestionForCopy } from '../lib/questionText'
import type { Question } from '../types/quiz'

const RESET_DELAY_MS = 1500

type CopyState = 'idle' | 'success' | 'error'

type QuestionCopyActionsProps = {
  question: Question
  className?: string
}

export function QuestionCopyActions({ question, className }: QuestionCopyActionsProps) {
  const [state, setState] = useState<CopyState>('idle')
  const timerRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
      }
    },
    [],
  )

  async function handleCopy() {
    const copied = await copyText(formatQuestionForCopy(question))
    setState(copied ? 'success' : 'error')

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
    }
    timerRef.current = window.setTimeout(() => setState('idle'), RESET_DELAY_MS)
  }

  const label = state === 'success' ? '已複製' : state === 'error' ? '複製失敗' : '複製'

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button
        type="button"
        onClick={() => void handleCopy()}
        aria-label={`複製第 ${question.number} 題的題目與選項`}
        className={cn(
          'inline-flex min-h-9 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
          state === 'success'
            ? 'border-correct/30 text-correct hover:bg-correct-soft'
            : state === 'error'
              ? 'border-wrong/30 text-wrong hover:bg-wrong-soft'
              : 'border-line bg-surface text-ink hover:bg-paper',
        )}
      >
        {state === 'success' ? (
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {label}
      </button>
      {state !== 'idle' && (
        <span className="sr-only" role="status" aria-live="polite">
          {state === 'success'
            ? '已複製題目與選項。'
            : '複製失敗，請手動選取題目。'}
        </span>
      )}
    </div>
  )
}
