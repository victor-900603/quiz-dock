import { useState, type KeyboardEvent } from 'react'
import { ChevronDown, ChevronUp, Eye, EyeOff, ListChecks, Star, X } from 'lucide-react'
import { Card } from './Card'
import { cn } from '../lib/cn'

export type QuestionNavigatorStatus = 'unanswered' | 'in-progress' | 'correct' | 'wrong'

export type QuestionNavigatorItem = {
  id: string
  number: number
  status: QuestionNavigatorStatus
  marked: boolean
}

type QuestionNavigatorProps = {
  items: QuestionNavigatorItem[]
  currentIndex: number
  answeredCount: number
  total: number
  showStatus: boolean
  onToggleStatus: () => void
  onJump: (index: number) => void
  onClose?: () => void
  variant?: 'inline' | 'dock'
}

const statusLabels: Record<QuestionNavigatorStatus, string> = {
  unanswered: '未作答',
  'in-progress': '作答中',
  correct: '答對',
  wrong: '答錯',
}

const statusClasses: Record<QuestionNavigatorStatus, string> = {
  unanswered: 'border-line bg-surface text-muted hover:border-accent/50 hover:text-ink',
  'in-progress': 'border-accent/40 bg-accent-soft text-accent',
  correct: 'border-correct/40 bg-correct-soft text-correct',
  wrong: 'border-wrong/40 bg-wrong-soft text-wrong',
}

export function QuestionNavigator({
  items,
  currentIndex,
  answeredCount,
  total,
  showStatus,
  onToggleStatus,
  onJump,
  onClose,
  variant = 'inline',
}: QuestionNavigatorProps) {
  const [expanded, setExpanded] = useState(true)
  const dock = variant === 'dock'

  function handleJump(index: number) {
    onJump(index)
    if (dock) onClose?.()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && onClose) {
      event.preventDefault()
      event.stopPropagation()
      onClose()
      return
    }

    if (event.key === 'Enter' || (event.key >= '1' && event.key <= '9')) {
      event.stopPropagation()
    }
  }

  return (
    <Card
      className={cn(
        dock
          ? 'mb-0 rounded-b-none border-x-0 border-b-0 p-3 shadow-none sm:p-4 lg:rounded-b-xl lg:border-x lg:border-b lg:shadow-card'
          : 'mb-5 p-4',
      )}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center justify-between gap-2">
        {dock ? (
          <div className="flex min-w-0 items-center gap-2 px-1 text-sm font-medium text-ink">
            <ListChecks className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            <span className="shrink-0">題號列表</span>
            <span className="shrink-0 font-mono text-xs font-normal text-muted">
              {showStatus ? `已答 ${answeredCount} / ${total}` : `共 ${total} 題`}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-controls="question-navigator-grid"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-left text-sm font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <ListChecks className="h-4 w-4 text-accent" aria-hidden="true" />
            <span>題號列表</span>
            <span className="font-mono text-xs font-normal text-muted">
              {showStatus ? `已答 ${answeredCount} / ${total}` : `共 ${total} 題`}
            </span>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted" aria-hidden="true" />
            )}
          </button>
        )}

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onToggleStatus}
            aria-pressed={showStatus}
            aria-label={showStatus ? '隱藏狀態' : '顯示狀態'}
            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-2 text-xs text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            {showStatus ? (
              <Eye className="h-4 w-4" aria-hidden="true" />
            ) : (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">{showStatus ? '隱藏狀態' : '顯示狀態'}</span>
          </button>

          {dock && onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="關閉題號列表"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted transition-colors hover:bg-paper hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {(dock || expanded) && (
        <>
          <nav
            id="question-navigator-grid"
            aria-label="題號列表"
            className={cn('mt-3 overflow-y-auto pr-1', dock ? 'max-h-[40vh]' : 'max-h-64')}
          >
            <div
              className={cn(
                'grid gap-2',
                dock ? 'grid-cols-6 sm:grid-cols-10 lg:grid-cols-12' : 'grid-cols-6 sm:grid-cols-10',
              )}
            >
              {items.map((item, index) => {
                const isCurrent = index === currentIndex
                const baseLabel = showStatus
                  ? `第 ${item.number} 題，${statusLabels[item.status]}`
                  : `第 ${item.number} 題`
                const label = item.marked ? `${baseLabel}，已標記` : baseLabel

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleJump(index)}
                    aria-current={isCurrent ? 'step' : undefined}
                    aria-label={label}
                    className={cn(
                      'relative flex min-h-11 items-center justify-center rounded-md border font-mono text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                      showStatus
                        ? statusClasses[item.status]
                        : 'border-line bg-surface text-muted hover:border-accent/50 hover:text-ink',
                      isCurrent &&
                        (showStatus
                          ? 'ring-2 ring-inset ring-accent'
                          : 'border-accent bg-accent-soft font-semibold text-accent ring-2 ring-inset ring-accent'),
                    )}
                  >
                    {String(item.number).padStart(2, '0')}
                    {item.marked && (
                      <Star
                        className="pointer-events-none absolute right-0.5 top-0.5 h-3 w-3 text-highlight"
                        fill="currentColor"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </nav>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
            {showStatus && (
              <>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-correct" aria-hidden="true" />
                  答對
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-wrong" aria-hidden="true" />
                  答錯
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-accent-soft ring-1 ring-accent/40" aria-hidden="true" />
                  作答中
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full border border-line bg-surface" aria-hidden="true" />
                  未作答
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-[3px] border-2 border-accent bg-surface"
                    aria-hidden="true"
                  />
                  目前
                </span>
              </>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Star className="h-3 w-3 text-highlight" fill="currentColor" aria-hidden="true" />
              已標記
            </span>
          </div>
        </>
      )}
    </Card>
  )
}
