import { Check, X } from 'lucide-react'
import { Button } from './Button'
import { Card } from './Card'
import { ExplanationPanel } from './ExplanationPanel'
import { MarkButton } from './MarkButton'
import { OptionButton, type OptionStatus } from './OptionButton'
import { cn } from '../lib/cn'
import { evaluateAnswer, isMultiAnswer } from '../features/practice/evaluate'
import type { Question } from '../types/quiz'

type QuestionCardProps = {
  question: Question
  selected: string[]
  submitted: boolean
  marked: boolean
  isLast: boolean
  onToggleOption: (key: string) => void
  onToggleMark: () => void
  onSubmit: () => void
  onNext: () => void
}

export function QuestionCard({
  question,
  selected,
  submitted,
  marked,
  isLast,
  onToggleOption,
  onToggleMark,
  onSubmit,
  onNext,
}: QuestionCardProps) {
  const multi = isMultiAnswer(question.correctAnswers)
  const correct = evaluateAnswer(selected, question.correctAnswers)

  function statusFor(key: string): OptionStatus {
    const isSelected = selected.includes(key)
    const isCorrect = question.correctAnswers.includes(key)

    if (!submitted) return isSelected ? 'selected' : 'idle'
    if (isCorrect) return isSelected ? 'correct' : 'missed'
    if (isSelected) return 'wrong'
    return 'idle'
  }

  return (
    <Card className="p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-line bg-paper px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
            {question.topic}
          </span>
          <span className="font-mono text-xs text-muted">#{String(question.number).padStart(3, '0')}</span>
        </div>
        <MarkButton marked={marked} onToggle={onToggleMark} />
      </div>

      <h2 className="mt-5 font-serif text-xl leading-[1.7] text-ink sm:text-2xl">{question.prompt}</h2>
      {multi && <p className="mt-2 text-sm text-muted">選出所有正確答案</p>}

      <div
        className="mt-6 space-y-3"
        role={multi ? 'group' : 'radiogroup'}
        aria-label="選項"
      >
        {question.options.map((option) => (
          <OptionButton
            key={option.key}
            option={option}
            selected={selected.includes(option.key)}
            status={statusFor(option.key)}
            disabled={submitted}
            multi={multi}
            onClick={() => onToggleOption(option.key)}
          />
        ))}
      </div>

      {submitted && (
        <div aria-live="polite" className="mt-5">
          <p
            className={cn(
              'inline-flex items-center gap-2 text-sm font-medium',
              correct ? 'text-correct' : 'text-wrong',
            )}
          >
            {correct ? <Check className="h-4 w-4" aria-hidden="true" /> : <X className="h-4 w-4" aria-hidden="true" />}
            {correct ? '答對了' : '答錯了'}
          </p>
          <ExplanationPanel
            correctAnswers={question.correctAnswers}
            explanation={question.explanation}
          />
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end lg:justify-between">
        <p className="hidden text-xs text-muted lg:block">鍵盤 1-9 選擇，Enter 送出</p>
        {submitted ? (
          <Button onClick={onNext} className="sm:min-w-36">
            {isLast ? '查看摘要' : '下一題'}
          </Button>
        ) : (
          <Button onClick={onSubmit} disabled={selected.length === 0} className="sm:min-w-36">
            確認答案
          </Button>
        )}
      </div>
    </Card>
  )
}
