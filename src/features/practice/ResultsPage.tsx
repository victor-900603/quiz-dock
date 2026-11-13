import { useMemo, useState } from 'react'
import { BarChart3, Pencil, RotateCcw } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AccuracySummary } from '../../components/AccuracySummary'
import { Button, buttonStyles } from '../../components/Button'
import { Card } from '../../components/Card'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'
import { StatCard } from '../../components/StatCard'
import { TopicBars } from '../../components/TopicBars'
import { formatDateTime, formatDuration } from '../../lib/format'
import type { PracticeSessionDetail } from '../../types/quiz'
import { usePracticeSessionQuery, useStartPracticeMutation } from './queries'
import { summarizeAttempts } from './session'

export function ResultsPage() {
  const { sessionId } = useParams()
  const [searchParams] = useSearchParams()
  const sessionQuery = usePracticeSessionQuery(sessionId)
  const backHref = searchParams.get('setId')
    ? `/sets/${searchParams.get('setId')}`
    : '/'

  if (!sessionId) {
    return (
      <EmptyState
        title="找不到練習摘要"
        description="這場練習不存在，或已經被移除。"
        action={
          <Link to={backHref} className={buttonStyles('secondary')}>
            回題庫
          </Link>
        }
      />
    )
  }

  if (sessionQuery.isPending) {
    return (
      <Card className="p-6 text-sm text-muted" role="status">
        載入練習摘要中...
      </Card>
    )
  }

  if (sessionQuery.isError) {
    return (
      <Card className="p-6" role="alert">
        <p className="text-sm text-wrong">
          {sessionQuery.error instanceof Error
            ? sessionQuery.error.message
            : '無法載入練習摘要，請稍後再試。'}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void sessionQuery.refetch()}>
            重新載入
          </Button>
          <Link to={backHref} className={buttonStyles('secondary')}>
            回題庫
          </Link>
        </div>
      </Card>
    )
  }

  const detail = sessionQuery.data
  if (!detail) {
    return (
      <EmptyState
        title="找不到練習摘要"
        description="這場練習不存在，或已經被移除。"
        action={
          <Link to={backHref} className={buttonStyles('secondary')}>
            回題庫
          </Link>
        }
      />
    )
  }

  if (detail.session.status === 'abandoned') {
    return (
      <EmptyState
        title="此場練習已結束"
        description="這場練習已結束，請回到題庫重新開始。"
        action={
          <Link to={`/sets/${detail.set.id}`} className={buttonStyles('secondary')}>
            回題庫
          </Link>
        }
      />
    )
  }

  return <ResultsView key={detail.session.id} sessionId={sessionId} detail={detail} />
}

type ResultsViewProps = {
  sessionId: string
  detail: PracticeSessionDetail
}

function ResultsView({ sessionId, detail }: ResultsViewProps) {
  const navigate = useNavigate()
  const startMutation = useStartPracticeMutation()
  const [restartOpen, setRestartOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const { session, set, questions, attempts } = detail
  const summary = useMemo(
    () => summarizeAttempts(questions, attempts),
    [attempts, questions],
  )
  const practiceHref = `/practice/${sessionId}?setId=${set.id}&mode=${session.mode}`

  async function handleRestart() {
    setActionError(null)

    try {
      const next = await startMutation.mutateAsync({
        setId: set.id,
        mode: session.mode,
        restart: true,
      })
      setRestartOpen(false)
      navigate(`/practice/${next.id}?setId=${next.setId}&mode=${next.mode}`)
    } catch (error) {
      setRestartOpen(false)
      setActionError(
        error instanceof Error ? error.message : '無法重新開始，請稍後再試。',
      )
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="練習摘要"
        title="練習完成"
        description={`${set.title}・${session.mode === 'random' ? '隨機模式' : '依序模式'}`}
      />

      <p className="mt-3 text-xs text-muted">
        開始 {formatDateTime(session.startedAt)}・
        {session.completedAt ? `完成 ${formatDateTime(session.completedAt)}` : '尚未完成'}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5 sm:p-6">
          <AccuracySummary correct={summary.correct} answered={summary.answered} />
        </Card>
        <StatCard label="已答題數" value={`${summary.answered}`} hint={`共 ${questions.length} 題`} />
        <StatCard label="答對題數" value={`${summary.correct}`} hint="以最新答案為準" />
        <StatCard
          label="花費時間"
          value={formatDuration(summary.durationSeconds)}
          hint="各題作答時間加總"
        />
      </div>

      <Card className="mt-6 p-5 sm:p-6">
        <h2 className="font-serif text-xl text-ink">主題正確率</h2>
        <div className="mt-5">
          <TopicBars topics={summary.topics} />
        </div>
      </Card>

      {actionError && (
        <p className="mt-4 text-sm text-wrong" role="alert">
          {actionError}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <Link to={practiceHref} className={buttonStyles('primary')}>
          <Pencil className="h-4 w-4" aria-hidden="true" />
          返回修改
        </Link>
        <button
          type="button"
          onClick={() => setRestartOpen(true)}
          disabled={startMutation.isPending}
          className={buttonStyles('secondary')}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          重新開始
        </button>
        <Link to={`/sets/${set.id}`} className={buttonStyles('secondary')}>
          回題庫
        </Link>
        <Link to="/stats" className={buttonStyles('secondary')}>
          <BarChart3 className="h-4 w-4" aria-hidden="true" />
          查看統計
        </Link>
      </div>

      <ConfirmDialog
        open={restartOpen}
        title="重新開始"
        description="重新開始會清除這個題庫的作答與統計，確定要繼續嗎？"
        confirmLabel="重新開始"
        confirmLoading={startMutation.isPending}
        cancelDisabled={startMutation.isPending}
        onCancel={() => setRestartOpen(false)}
        onConfirm={() => void handleRestart()}
      />
    </>
  )
}
