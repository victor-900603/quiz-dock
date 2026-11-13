import { useState } from 'react'
import { ChevronDown, Star } from 'lucide-react'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { MarkButton } from '../../components/MarkButton'
import { PageHeader } from '../../components/PageHeader'
import { cn } from '../../lib/cn'
import { formatShortDateTime } from '../../lib/format'
import type { MarkedQuestion } from '../../types/quiz'
import { useMarksQuery, useToggleMarkMutation } from './queries'

export function MarksPage() {
  const marksQuery = useMarksQuery()
  const toggleMarkMutation = useToggleMarkMutation()
  const [expanded, setExpanded] = useState<string | null>(null)
  const marks = marksQuery.data ?? []

  function handleRemove(mark: MarkedQuestion) {
    toggleMarkMutation.mutate({
      questionId: mark.id,
      marked: true,
      question: mark,
      setId: mark.setId,
      setTitle: mark.setTitle,
    })
  }

  return (
    <>
      <PageHeader
        eyebrow="回顧"
        title="已標記題目"
        description="練習時點星號的題目會集中在這裡，方便之後快速翻閱。"
      />

      {toggleMarkMutation.isError && (
        <p className="mb-4 text-sm text-wrong" role="alert">
          標記失敗，請再試一次
        </p>
      )}

      {marksQuery.isPending ? (
        <Card className="p-6 text-sm text-muted" role="status">
          載入標記中...
        </Card>
      ) : marksQuery.isError ? (
        <Card className="p-6" role="alert">
          <p className="text-sm text-wrong">
            {marksQuery.error instanceof Error
              ? marksQuery.error.message
              : '無法載入標記，請稍後再試。'}
          </p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => void marksQuery.refetch()}
          >
            重新載入
          </Button>
        </Card>
      ) : marks.length === 0 ? (
        <EmptyState
          icon={<Star className="h-8 w-8" aria-hidden="true" />}
          title="還沒有標記題目"
          description="練習時點星號即可加入。"
        />
      ) : (
        <div className="space-y-3">
          {marks.map((mark) => {
            const open = expanded === mark.id

            return (
              <Card key={mark.id} className="overflow-hidden">
                <div className="flex items-start gap-3 p-4 sm:p-5">
                  <MarkButton marked onToggle={() => handleRemove(mark)} />
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : mark.id)}
                    aria-expanded={open}
                    className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span>{mark.setTitle}</span>
                      <span className="font-mono">#{String(mark.number).padStart(3, '0')}</span>
                      <span className="rounded-full border border-line bg-paper px-2 py-0.5">
                        {mark.topic}
                      </span>
                      <span className="ml-auto">
                        {formatShortDateTime(mark.markedAt)}
                      </span>
                    </div>
                    <p className="mt-2 font-serif text-lg leading-snug text-ink">{mark.prompt}</p>
                    <span className="mt-2 inline-flex items-center gap-1 text-xs text-muted">
                      {open ? '收合' : '展開題目'}
                      <ChevronDown
                        className={cn('h-4 w-4 transition-transform duration-150', open && 'rotate-180')}
                        aria-hidden="true"
                      />
                    </span>
                  </button>
                </div>

                {open && (
                  <div className="border-t border-line bg-paper/60 px-4 py-4 sm:px-5">
                    <ol className="space-y-2">
                      {mark.options.map((option) => (
                        <li key={option.key} className="flex gap-2 text-sm leading-6">
                          <span className="font-mono text-muted">{option.key}</span>
                          <span className="min-w-0 flex-1 text-ink">{option.text}</span>
                          {mark.correctAnswers.includes(option.key) && (
                            <span className="shrink-0 text-xs font-medium text-correct">正確答案</span>
                          )}
                        </li>
                      ))}
                    </ol>
                    <div className="mt-4 rounded-lg border border-line bg-surface p-4">
                      <p className="text-xs text-muted">解析</p>
                      <p className="mt-2 whitespace-pre-line text-sm leading-7 text-ink">
                        {mark.explanation || '本題沒有解析'}
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}
