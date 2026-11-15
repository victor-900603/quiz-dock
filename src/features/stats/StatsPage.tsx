import { useState } from 'react'
import { BarChart3, BookOpen, CalendarDays, Target, Trash2 } from 'lucide-react'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'
import { StatCard } from '../../components/StatCard'
import { TopicBars } from '../../components/TopicBars'
import { cn } from '../../lib/cn'
import { formatPercent, formatShortDateTime } from '../../lib/format'
import type {
  PracticeMode,
  PracticeStatus,
  SessionSummary,
  StatsOverview,
} from '../../types/quiz'
import { useDeletePracticeSessionMutation } from '../practice/queries'
import { useStatsOverviewQuery } from './queries'

const modeLabels: Record<PracticeMode, string> = {
  sequential: '依序',
  random: '隨機',
}

const statusLabels: Record<PracticeStatus, string> = {
  in_progress: '進行中',
  completed: '已完成',
  abandoned: '已放棄',
}

function StatsSkeleton() {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">載入統計中...</span>
      <div className="grid gap-4 sm:grid-cols-2" aria-hidden="true">
        {[0, 1, 2, 3].map((item) => (
          <Card key={item} className="p-5">
            <div className="h-3 w-20 animate-pulse rounded bg-line/70" />
            <div className="mt-4 h-8 w-24 animate-pulse rounded bg-line/60" />
            <div className="mt-3 h-3 w-28 animate-pulse rounded bg-line/50" />
          </Card>
        ))}
      </div>

      <Card className="mt-6 p-5 sm:p-6" aria-hidden="true">
        <div className="h-5 w-32 animate-pulse rounded bg-line/70" />
        <div className="mt-6 space-y-4">
          {[0, 1, 2].map((item) => (
            <div key={item} className="space-y-2">
              <div className="h-3 w-40 animate-pulse rounded bg-line/60" />
              <div className="h-1.5 w-full animate-pulse rounded-full bg-line/50" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function StatsContent({ stats }: { stats: StatsOverview }) {
  const maxDaily = Math.max(...stats.dailyActivity.map((item) => item.answered), 1)
  const deleteMutation = useDeletePracticeSessionMutation()
  const [sessionToDelete, setSessionToDelete] = useState<SessionSummary | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function handleDeleteSession() {
    if (!sessionToDelete) return
    const sessionId = sessionToDelete.id
    setSessionToDelete(null)
    setActionError(null)

    try {
      await deleteMutation.mutateAsync(sessionId)
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : '無法刪除練習紀錄，請稍後再試。',
      )
    }
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="總作答"
          value={`${stats.totalAnswered}`}
          hint="所有練習場次"
          icon={<BookOpen className="h-4 w-4" aria-hidden="true" />}
        />
        <StatCard
          label="總正確率"
          value={formatPercent(stats.totalCorrect, stats.totalAnswered)}
          hint={`答對 ${stats.totalCorrect} 題`}
          icon={<Target className="h-4 w-4" aria-hidden="true" />}
        />
        <StatCard
          label="已練題庫"
          value={`${stats.practicedSets}`}
          hint="有作答紀錄的題庫"
          icon={<BarChart3 className="h-4 w-4" aria-hidden="true" />}
        />
        <StatCard
          label="本週作答"
          value={`${stats.weeklyAnswered}`}
          hint="最近 7 天"
          icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
        />
      </div>

      <Card className="mt-6 p-5 sm:p-6">
        <h2 className="font-serif text-xl text-ink">各題庫正確率</h2>
        {stats.setStats.length === 0 ? (
          <p className="mt-5 text-sm text-muted">還沒有題庫統計。</p>
        ) : (
          <div className="mt-5 space-y-4">
            {stats.setStats.map((item) => (
              <div
                key={item.setId}
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
        )}
      </Card>

      <Card className="mt-6 p-5 sm:p-6">
        <h2 className="font-serif text-xl text-ink">主題正確率</h2>
        <div className="mt-5">
          <TopicBars topics={stats.topicStats} />
        </div>
      </Card>

      <Card className="mt-6 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-xl text-ink">最近 14 天活動</h2>
          <p className="text-xs text-muted">以台北時間分組</p>
        </div>
        <div className="mt-6 grid grid-cols-7 gap-x-2 gap-y-4 sm:grid-cols-[repeat(14,minmax(0,1fr))]">
          {stats.dailyActivity.map((item) => (
            <div key={item.day} className="flex flex-col items-center gap-2">
              <div className="flex h-24 w-full items-end justify-center">
                <div
                  className={cn(
                    'w-full max-w-6 rounded-t bg-accent/80',
                    item.answered === 0 && 'bg-line',
                  )}
                  style={{
                    height: `${Math.max(4, (item.answered / maxDaily) * 100)}%`,
                  }}
                  title={`${item.label}：${item.answered} 題`}
                />
              </div>
              <span className="font-mono text-[10px] text-muted">{item.label}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-6 p-5 sm:p-6">
        <h2 className="font-serif text-xl text-ink">最近練習</h2>
        <p className="mt-1 text-sm text-muted">
          統計累計所有練習場次；刪除紀錄會一併移除該場作答。
        </p>
        {actionError && (
          <p className="mt-3 text-sm text-wrong" role="alert">
            {actionError}
          </p>
        )}
        {stats.recentSessions.length === 0 ? (
          <p className="mt-4 text-sm text-muted">還沒有練習場次。</p>
        ) : (
          <div className="mt-4 divide-y divide-line">
            {stats.recentSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink">{session.setTitle}</p>
                  <p className="mt-1 text-xs text-muted">
                    {modeLabels[session.mode]}・{statusLabels[session.status]}・
                    <time dateTime={session.completedAt ?? session.updatedAt}>
                      {formatShortDateTime(session.completedAt ?? session.updatedAt)}
                    </time>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="text-right">
                    <p className="font-mono text-sm text-ink">
                      {formatPercent(session.correct, session.answered)}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {session.correct} / {session.answered}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => setSessionToDelete(session)}
                    aria-label={`刪除 ${session.setTitle} 的練習紀錄`}
                    className="px-2 text-wrong"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={sessionToDelete !== null}
        title="刪除練習紀錄"
        description={`確定要刪除這筆練習紀錄嗎？該場 ${sessionToDelete?.answered ?? 0} 題的作答會一併移除，題目標記不受影響。`}
        confirmLabel="刪除"
        confirmLoading={deleteMutation.isPending}
        cancelDisabled={deleteMutation.isPending}
        onCancel={() => setSessionToDelete(null)}
        onConfirm={() => void handleDeleteSession()}
      />
    </>
  )
}

export function StatsPage() {
  const statsQuery = useStatsOverviewQuery()
  const stats = statsQuery.data

  return (
    <>
      <PageHeader
        eyebrow="學習狀況"
        title="學習統計"
        description="從正確率與主題分布找出需要再加強的地方。"
      />

      {statsQuery.isPending ? (
        <StatsSkeleton />
      ) : statsQuery.isError ? (
        <Card className="p-6" role="alert">
          <p className="text-sm text-wrong">
            {statsQuery.error instanceof Error
              ? statsQuery.error.message
              : '無法載入統計，請稍後再試。'}
          </p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => void statsQuery.refetch()}
          >
            重新載入
          </Button>
        </Card>
      ) : !stats || stats.totalAnswered === 0 ? (
        <EmptyState
          icon={<BarChart3 className="h-8 w-8" aria-hidden="true" />}
          title="還沒有統計資料"
          description="完成第一場練習後，這裡會顯示統計。"
        />
      ) : (
        <StatsContent stats={stats} />
      )}
    </>
  )
}
