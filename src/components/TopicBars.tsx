import { cn } from '../lib/cn'
import { formatPercent } from '../lib/format'
import type { TopicStat } from '../types/quiz'

type TopicBarsProps = {
  topics: TopicStat[]
  emptyLabel?: string
}

export function TopicBars({ topics, emptyLabel = '尚無主題資料' }: TopicBarsProps) {
  if (topics.length === 0) {
    return <p className="text-sm text-muted">{emptyLabel}</p>
  }

  return (
    <div className="space-y-4">
      {topics.map((topic) => {
        const percentage = topic.answered > 0 ? (topic.correct / topic.answered) * 100 : 0
        const low = topic.answered > 0 && percentage < 60

        return (
          <div key={topic.name}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="min-w-0 truncate text-sm text-ink">{topic.name}</p>
              <p className="shrink-0 font-mono text-xs text-muted">
                {topic.answered > 0 ? `${topic.correct} / ${topic.answered}` : '--'}
              </p>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                <div
                  className={cn('h-full rounded-full', low ? 'bg-wrong' : 'bg-accent')}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className={cn('w-12 text-right font-mono text-xs', low ? 'text-wrong' : 'text-muted')}>
                {formatPercent(topic.correct, topic.answered)}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
