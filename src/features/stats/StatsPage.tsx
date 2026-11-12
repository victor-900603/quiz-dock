import { BarChart3, BookOpen, CalendarDays, Target } from 'lucide-react'
import { Card } from '../../components/Card'
import { PageHeader } from '../../components/PageHeader'
import { StatCard } from '../../components/StatCard'
import { TopicBars } from '../../components/TopicBars'
import { mockStats } from '../../data/mock'
import { cn } from '../../lib/cn'
import { formatPercent } from '../../lib/format'

export function StatsPage() {
  const maxDaily = Math.max(...mockStats.dailyActivity.map((item) => item.count), 1)

  return (
    <>
      <PageHeader
        eyebrow="學習狀況"
        title="學習統計"
        description="從正確率與主題分布找出需要再加強的地方。"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="總作答"
          value={`${mockStats.totalAnswered}`}
          hint="所有練習場次"
          icon={<BookOpen className="h-4 w-4" aria-hidden="true" />}
        />
        <StatCard
          label="總正確率"
          value={formatPercent(mockStats.totalCorrect, mockStats.totalAnswered)}
          hint={`答對 ${mockStats.totalCorrect} 題`}
          icon={<Target className="h-4 w-4" aria-hidden="true" />}
        />
        <StatCard
          label="已練題庫"
          value={`${mockStats.practicedSets}`}
          hint="有作答紀錄的題庫"
          icon={<BarChart3 className="h-4 w-4" aria-hidden="true" />}
        />
        <StatCard
          label="本週作答"
          value={`${mockStats.weeklyAnswered}`}
          hint="最近 7 天"
          icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
        />
      </div>

      <Card className="mt-6 p-5 sm:p-6">
        <h2 className="font-serif text-xl text-ink">各題庫正確率</h2>
        <div className="mt-5 space-y-4">
          {mockStats.setStats.map((item) => (
            <div
              key={item.title}
              className="flex items-center justify-between gap-4 border-b border-line pb-3 last:border-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-ink">{item.title}</p>
                <p className="mt-1 text-xs text-muted">
                  {item.correct} / {item.answered} 題
                </p>
              </div>
              <p className="shrink-0 font-serif text-2xl text-ink">
                {formatPercent(item.correct, item.answered)}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-6 p-5 sm:p-6">
        <h2 className="font-serif text-xl text-ink">主題正確率</h2>
        <div className="mt-5">
          <TopicBars topics={mockStats.topicStats} />
        </div>
      </Card>

      <Card className="mt-6 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-xl text-ink">最近 14 天活動</h2>
          <p className="text-xs text-muted">以台北時間分組</p>
        </div>
        <div className="mt-6 grid grid-cols-7 gap-x-2 gap-y-4 sm:grid-cols-[repeat(14,minmax(0,1fr))]">
          {mockStats.dailyActivity.map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-2">
              <div className="flex h-24 w-full items-end justify-center">
                <div
                  className={cn('w-full max-w-6 rounded-t bg-accent/80', item.count === 0 && 'bg-line')}
                  style={{ height: `${Math.max(4, (item.count / maxDaily) * 100)}%` }}
                  title={`${item.label}：${item.count} 題`}
                />
              </div>
              <span className="font-mono text-[10px] text-muted">{item.label}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-6 p-5 sm:p-6">
        <h2 className="font-serif text-xl text-ink">最近練習</h2>
        <div className="mt-4 divide-y divide-line">
          {mockStats.recentSessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate text-sm text-ink">{session.setTitle}</p>
                <p className="mt-1 text-xs text-muted">
                  {session.mode}・{session.dateLabel}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-sm text-ink">
                  {formatPercent(session.correct, session.answered)}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {session.correct} / {session.answered}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}
