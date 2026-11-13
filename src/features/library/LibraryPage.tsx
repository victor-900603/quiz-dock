import { useState } from 'react'
import { ArrowRight, BookOpen, Upload } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { buttonStyles, Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { ImportDialog } from '../../components/ImportDialog'
import { PageHeader } from '../../components/PageHeader'
import { ProgressBar } from '../../components/ProgressBar'
import { QuizSetCard } from '../../components/QuizSetCard'
import type { ImportPayload } from '../../schemas/import'
import { useMarksQuery } from '../marks/queries'
import { usePracticeSessionsQuery, useStartPracticeMutation } from '../practice/queries'
import { useImportSetMutation, useSetsQuery } from './queries'

export function LibraryPage() {
  const marksQuery = useMarksQuery()
  const navigate = useNavigate()
  const setsQuery = useSetsQuery()
  const sessionsQuery = usePracticeSessionsQuery()
  const importMutation = useImportSetMutation()
  const startMutation = useStartPracticeMutation()
  const [importOpen, setImportOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const sets = setsQuery.data ?? []
  const marks = marksQuery.data ?? []
  const progressBySet = new Map(
    (sessionsQuery.data ?? []).map((progress) => [progress.setId, progress]),
  )
  const activeProgress = (sessionsQuery.data ?? [])[0]
  const activeSet = activeProgress
    ? sets.find((set) => set.id === activeProgress.setId)
    : undefined
  const activeHref = activeProgress
    ? activeProgress.status === 'completed'
      ? `/results/${activeProgress.id}`
      : `/practice/${activeProgress.id}?setId=${activeProgress.setId}&mode=${activeProgress.mode}`
    : null

  async function handleImport(payload: ImportPayload) {
    const result = await importMutation.mutateAsync(payload)
    setNotice(`已匯入「${result.title}」。`)
  }

  async function handleStartPractice(setId: string) {
    setActionError(null)

    try {
      const session = await startMutation.mutateAsync({ setId, mode: 'sequential' })
      navigate(`/practice/${session.id}?setId=${setId}&mode=${session.mode}`)
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : '無法開始練習，請稍後再試。',
      )
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="QuizDock"
        title="我的題庫"
        description="挑一份題庫，從上次停下的地方繼續。"
        actions={
          <Button onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" aria-hidden="true" />
            匯入題庫
          </Button>
        }
      />

      {notice && (
        <div
          className="mb-6 rounded-lg border border-correct/30 bg-correct-soft px-4 py-3 text-sm text-correct"
          role="status"
        >
          {notice}
        </div>
      )}

      {actionError && (
        <div
          className="mb-6 rounded-lg border border-wrong/30 bg-wrong-soft px-4 py-3 text-sm text-wrong"
          role="alert"
        >
          {actionError}
        </div>
      )}

      {activeSet && activeProgress && activeHref && (
        <Card className="mb-6 overflow-hidden p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
                {activeProgress.status === 'completed' ? '已完成' : '進行中'}
              </p>
              <h2 className="mt-1 font-serif text-xl text-ink">{activeSet.title}</h2>
              <p className="mt-1 text-sm text-muted">
                已答 {activeProgress.answered} / {activeProgress.total} 題
              </p>
            </div>
            <Link to={activeHref} className={buttonStyles('primary')}>
              {activeProgress.status === 'completed' ? '查看摘要' : '繼續練習'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-5">
            <ProgressBar
              answered={activeProgress.answered}
              total={activeProgress.total}
              label="目前進度"
            />
          </div>
        </Card>
      )}

      {setsQuery.isPending ? (
        <Card className="p-6 text-sm text-muted" role="status">
          載入題庫中...
        </Card>
      ) : setsQuery.isError ? (
        <Card className="p-6" role="alert">
          <p className="text-sm text-wrong">
            {setsQuery.error instanceof Error
              ? setsQuery.error.message
              : '無法載入題庫，請稍後再試。'}
          </p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => void setsQuery.refetch()}
          >
            重新載入
          </Button>
        </Card>
      ) : sets.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-8 w-8" aria-hidden="true" />}
          title="還沒有題庫"
          description="先匯入一份 JSON，開始建立你的練習本。"
          action={
            <Button onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" aria-hidden="true" />
              匯入題庫
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sets.map((set) => (
            <QuizSetCard
              key={set.id}
              set={set}
              progress={progressBySet.get(set.id)}
              practicePending={
                startMutation.isPending && startMutation.variables?.setId === set.id
              }
              onPractice={() => void handleStartPractice(set.id)}
              markedCount={marks.filter((mark) => mark.setId === set.id).length}
            />
          ))}
        </div>
      )}

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImport}
      />
    </>
  )
}
