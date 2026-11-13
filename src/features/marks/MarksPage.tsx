import { useMemo, useState } from 'react'
import { ChevronDown, Star } from 'lucide-react'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { MarkButton } from '../../components/MarkButton'
import { PageHeader } from '../../components/PageHeader'
import { cn } from '../../lib/cn'
import { formatShortDateTime } from '../../lib/format'
import type { MarkedQuestion } from '../../types/quiz'
import { groupMarksBySet } from './groupMarks'
import { useMarksQuery, useToggleMarkMutation } from './queries'

const pageDescription = '練習時點星號的題目會集中在這裡，方便之後快速翻閱。'

function MarksSkeleton() {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">載入標記中...</span>
      <div className="space-y-4" aria-hidden="true">
        {[0, 1, 2].map((group) => (
          <Card key={group} className="overflow-hidden">
            <div className="border-b border-line bg-paper/50 px-4 py-3">
              <div className="h-4 w-32 animate-pulse rounded bg-line/70" />
            </div>
            <div className="divide-y divide-line">
              {[0, 1, 2].map((row) => (
                <div key={row} className="flex items-start gap-3 px-4 py-3">
                  <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-line/60" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-3 w-28 animate-pulse rounded bg-line/60" />
                    <div className="h-4 w-3/4 animate-pulse rounded bg-line/50" />
                    <div className="h-3 w-20 animate-pulse rounded bg-line/50" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function MarksPage() {
  const marksQuery = useMarksQuery()
  const toggleMarkMutation = useToggleMarkMutation()
  const [expanded, setExpanded] = useState<string | null>(null)
  const marks = marksQuery.data ?? []
  const groups = useMemo(() => groupMarksBySet(marks), [marks])

  const description =
    marksQuery.isSuccess && marks.length > 0
      ? `共 ${marks.length} 題標記，來自 ${groups.length} 個題庫。`
      : pageDescription

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
      <PageHeader eyebrow="回顧" title="已標記題目" description={description} />

      {toggleMarkMutation.isError && (
        <p className="mb-4 text-sm text-wrong" role="alert">
          標記失敗，請再試一次
        </p>
      )}

      {marksQuery.isPending ? (
        <MarksSkeleton />
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
        <div className="space-y-4">
          {groups.map((group) => (
            <Card
              key={group.setId}
              role="group"
              aria-labelledby={`marks-group-${group.setId}`}
              className="overflow-hidden"
            >
              <div className="flex items-baseline justify-between gap-3 border-b border-line bg-paper/50 px-4 py-3">
                <h2
                  id={`marks-group-${group.setId}`}
                  className="min-w-0 truncate font-serif text-lg leading-snug text-ink"
                >
                  {group.setTitle}
                </h2>
                <span className="shrink-0 font-mono text-xs text-muted">
                  {group.marks.length} 題
                </span>
              </div>

              <ul className="divide-y divide-line">
                {group.marks.map((mark) => {
                  const open = expanded === mark.id
                  const panelId = `marks-panel-${mark.id}`

                  return (
                    <li key={mark.id}>
                      <div className="flex items-start gap-1 px-2 py-2 sm:gap-2 sm:px-3">
                        <MarkButton
                          marked
                          onToggle={() => handleRemove(mark)}
                          className="mt-0.5"
                        />
                        <button
                          type="button"
                          onClick={() => setExpanded(open ? null : mark.id)}
                          aria-expanded={open}
                          aria-controls={panelId}
                          className="min-h-11 min-w-0 flex-1 rounded-md px-1 py-1 text-left transition-colors hover:bg-paper/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                        >
                          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-muted">
                            <span className="font-mono text-[13px] text-ink">
                              #{String(mark.number).padStart(3, '0')}
                            </span>
                            <span className="rounded-full border border-line bg-paper px-2 py-0.5 text-[11px] font-medium tracking-[0.08em]">
                              {mark.topic}
                            </span>
                            <time
                              dateTime={mark.markedAt}
                              className="ml-auto font-mono text-[11px]"
                            >
                              {formatShortDateTime(mark.markedAt)}
                            </time>
                          </span>
                          <span className="mt-1 line-clamp-2 block font-serif text-base leading-snug text-ink">
                            {mark.prompt}
                          </span>
                          <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted">
                            {open ? '收合' : '展開題目'}
                            <ChevronDown
                              className={cn(
                                'h-3.5 w-3.5 transition-transform duration-150',
                                open && 'rotate-180',
                              )}
                              aria-hidden="true"
                            />
                          </span>
                        </button>
                      </div>

                      {open && (
                        <div
                          id={panelId}
                          className="border-t border-line bg-paper/60 px-4 py-4 sm:px-5"
                        >
                          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
                            選項
                          </p>
                          <ol className="mt-2 space-y-2">
                            {mark.options.map((option) => {
                              const isAnswer = mark.correctAnswers.includes(option.key)

                              return (
                                <li
                                  key={option.key}
                                  className="flex gap-2 text-sm leading-6"
                                >
                                  <span
                                    className={cn(
                                      'font-mono',
                                      isAnswer ? 'font-semibold text-correct' : 'text-muted',
                                    )}
                                  >
                                    {option.key}
                                  </span>
                                  <span className="min-w-0 flex-1 text-ink">
                                    {option.text}
                                  </span>
                                  {isAnswer && (
                                    <span className="shrink-0 text-xs font-medium text-correct">
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
                              {mark.explanation || '本題沒有解析'}
                            </p>
                          </div>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
