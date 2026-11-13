import type { TopicStat } from '../types/quiz'

type TopicCountsProps = {
  topics: TopicStat[]
  emptyLabel?: string
}

export function TopicCounts({ topics, emptyLabel = '尚無主題資料' }: TopicCountsProps) {
  if (topics.length === 0) {
    return <p className="text-sm text-muted">{emptyLabel}</p>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {topics.map((topic) => (
        <span
          key={topic.name}
          className="rounded-full border border-line bg-paper px-2.5 py-1 text-xs text-muted"
        >
          {topic.name} · {topic.total ?? topic.answered} 題
        </span>
      ))}
    </div>
  )
}
