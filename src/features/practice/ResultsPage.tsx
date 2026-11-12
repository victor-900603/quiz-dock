import { useState } from 'react'
import { BarChart3, Pencil, RotateCcw } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AccuracySummary } from '../../components/AccuracySummary'
import { buttonStyles } from '../../components/Button'
import { Card } from '../../components/Card'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { PageHeader } from '../../components/PageHeader'
import { StatCard } from '../../components/StatCard'
import { TopicBars } from '../../components/TopicBars'
import { mockSummary } from '../../data/mock'
import { formatDuration } from '../../lib/format'
import type { SessionSummary } from '../../types/quiz'

export function ResultsPage() {
  const { sessionId = 'demo-session' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [restartOpen, setRestartOpen] = useState(false)
  const summary = (location.state as SessionSummary | null) ?? mockSummary

  return (
    <>
      <PageHeader
        eyebrow="練習摘要"
        title="練習完成"
        description={`${summary.setTitle}・${summary.mode === 'random' ? '隨機模式' : '依序模式'}`}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5 sm:col-span-1 sm:p-6">
          <AccuracySummary correct={summary.correct} answered={summary.answered} />
        </Card>
        <StatCard label="答對題數" value={`${summary.correct}`} hint="本場練習" />
        <StatCard label="花費時間" value={formatDuration(summary.durationSeconds)} hint="包含閱讀與作答" />
      </div>

      <Card className="mt-6 p-5 sm:p-6">
        <h2 className="font-serif text-xl text-ink">主題正確率</h2>
        <div className="mt-5">
          <TopicBars topics={summary.topics} />
        </div>
      </Card>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          to={`/practice/${sessionId}?setId=${summary.setId}&mode=${summary.mode}&resume=1`}
          className={buttonStyles('primary')}
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
          返回修改
        </Link>
        <button
          type="button"
          onClick={() => setRestartOpen(true)}
          className={buttonStyles('secondary')}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          重新開始
        </button>
        <Link to={`/sets/${summary.setId}`} className={buttonStyles('secondary')}>
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
        onCancel={() => setRestartOpen(false)}
        onConfirm={() => {
          setRestartOpen(false)
          navigate(`/practice/${sessionId}?setId=${summary.setId}&mode=${summary.mode}&restart=1`)
        }}
      />
    </>
  )
}
