import { useCallback, useState } from 'react'
import {
  ArrowLeft,
  Download,
  ListOrdered,
  Pencil,
  Play,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ActionMenu } from '../../components/ActionMenu'
import { Button, buttonStyles } from '../../components/Button'
import { Card } from '../../components/Card'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { EmptyState } from '../../components/EmptyState'
import { Modal } from '../../components/Modal'
import { PageHeader } from '../../components/PageHeader'
import { ProgressBar } from '../../components/ProgressBar'
import { StartPracticeDialog, type StartPracticeOptions } from '../../components/StartPracticeDialog'
import { StatCard } from '../../components/StatCard'
import { SyncDialog } from '../../components/SyncDialog'
import { TopicCounts } from '../../components/TopicCounts'
import { downloadTextFile } from '../../lib/download'
import { formatPercentValue, formatShortDateTime } from '../../lib/format'
import type { ImportPayload } from '../../schemas/import'
import type { PracticeMode, PracticeProgress } from '../../types/quiz'
import { useMarksQuery } from '../marks/queries'
import {
  useClearPracticeSessionsMutation,
  useDeletePracticeSessionMutation,
  useFinishPracticeSessionMutation,
  usePracticeSessionsQuery,
  useStartPracticeMutation,
} from '../practice/queries'
import { exportQuizSet } from './exportService'
import {
  useDeleteSetMutation,
  useRenameSetMutation,
  useSetQuery,
  useSyncSetMutation,
} from './queries'
import { previewQuizSetSync } from './syncService'

const modeLabels: Record<PracticeMode, string> = {
  sequential: '依序',
  random: '隨機',
}

export function SetDetailPage() {
  const { setId } = useParams()
  const navigate = useNavigate()
  const marksQuery = useMarksQuery()
  const setQuery = useSetQuery(setId)
  const sessionsQuery = usePracticeSessionsQuery()
  const startMutation = useStartPracticeMutation()
  const finishMutation = useFinishPracticeSessionMutation()
  const deleteSessionMutation = useDeletePracticeSessionMutation()
  const clearSessionsMutation = useClearPracticeSessionsMutation()
  const renameMutation = useRenameSetMutation()
  const deleteMutation = useDeleteSetMutation()
  const syncMutation = useSyncSetMutation()
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [syncOpen, setSyncOpen] = useState(false)
  const [startOpen, setStartOpen] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<PracticeProgress | null>(null)
  const [clearOpen, setClearOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [renameTitle, setRenameTitle] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  const buildSyncPlan = useCallback(
    (payload: ImportPayload) => {
      if (!setId) throw new Error('找不到題庫。')
      return previewQuizSetSync(setId, payload)
    },
    [setId],
  )

  const set = setQuery.data?.set
  const questions = setQuery.data?.questions ?? []
  const setSessions = (sessionsQuery.data ?? []).filter(
    (session) => session.setId === set?.id,
  )
  const activeSession = setSessions.find(
    (session) => session.status === 'in_progress',
  )
  const practiceHref = activeSession
    ? `/practice/${activeSession.id}?setId=${activeSession.setId}&mode=${activeSession.mode}`
    : null

  function openRename() {
    setRenameTitle(set?.title ?? '')
    setActionError(null)
    setRenameOpen(true)
  }

  async function handleStart(options: StartPracticeOptions) {
    if (!set) return

    const session = await startMutation.mutateAsync({
      setId: set.id,
      mode: options.mode,
      limit: options.limit,
      sourceSessionId: options.sourceSessionId,
    })
    setStartOpen(false)
    navigate(`/practice/${session.id}?setId=${set.id}&mode=${session.mode}`)
  }

  async function handleFinish(sessionId: string) {
    setActionError(null)

    try {
      await finishMutation.mutateAsync(sessionId)
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : '無法結束練習，請稍後再試。',
      )
    }
  }

  async function handleDeleteSession() {
    if (!sessionToDelete) return
    const sessionId = sessionToDelete.id
    setSessionToDelete(null)
    setActionError(null)

    try {
      await deleteSessionMutation.mutateAsync(sessionId)
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : '無法刪除練習紀錄，請稍後再試。',
      )
    }
  }

  async function handleClearSessions() {
    if (!set) return
    setActionError(null)

    try {
      await clearSessionsMutation.mutateAsync(set.id)
      setClearOpen(false)
    } catch (error) {
      setClearOpen(false)
      setActionError(
        error instanceof Error ? error.message : '無法清除練習紀錄，請稍後再試。',
      )
    }
  }

  async function handleRename() {
    if (!set) return

    const nextTitle = renameTitle.trim()
    if (!nextTitle) return

    setActionError(null)

    try {
      await renameMutation.mutateAsync({ setId: set.id, title: nextTitle })
      setRenameOpen(false)
    } catch (error) {
      setRenameOpen(false)
      setActionError(
        error instanceof Error ? error.message : '重新命名失敗，請稍後再試。',
      )
    }
  }

  async function handleDelete() {
    if (!set) return

    setActionError(null)

    try {
      await deleteMutation.mutateAsync(set.id)
      navigate('/')
    } catch (error) {
      setDeleteOpen(false)
      setActionError(error instanceof Error ? error.message : '刪除題庫失敗，請稍後再試。')
    }
  }

  async function handleExport() {
    if (!set || exporting) return

    setActionError(null)
    setExporting(true)

    try {
      const result = await exportQuizSet(set.id)
      downloadTextFile(result.fileName, result.text)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '匯出題庫失敗，請稍後再試。')
    } finally {
      setExporting(false)
    }
  }

  async function handleSync(payload: ImportPayload) {
    if (!set) return
    await syncMutation.mutateAsync({ setId: set.id, payload })
  }

  if (setQuery.isPending) {
    return (
      <Card className="p-6 text-sm text-muted" role="status">
        載入題庫中...
      </Card>
    )
  }

  if (setQuery.isError) {
    return (
      <Card className="p-6" role="alert">
        <p className="text-sm text-wrong">
          {setQuery.error instanceof Error
            ? setQuery.error.message
            : '無法載入題庫，請稍後再試。'}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void setQuery.refetch()}>
            重新載入
          </Button>
          <Link to="/" className={buttonStyles('secondary')}>
            回題庫
          </Link>
        </div>
      </Card>
    )
  }

  if (!set) {
    return (
      <EmptyState
        title="找不到題庫"
        description="這個題庫不存在，或已經被移除。"
        action={
          <Link to="/" className={buttonStyles('secondary')}>
            回題庫
          </Link>
        }
      />
    )
  }

  const markedCount = (marksQuery.data ?? []).filter((mark) => mark.setId === set.id).length
  const practiceDisabled = set.questionCount === 0
  const finishingId = finishMutation.isPending ? finishMutation.variables : null

  return (
    <>
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-accent"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        回題庫
      </Link>

      <PageHeader
        eyebrow="題庫詳情"
        title={set.title}
        description={set.description}
        actionsClassName="flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0 sm:flex-nowrap"
        actions={
          activeSession ? (
            <>
              <Link
                to={practiceHref as string}
                className={buttonStyles(
                  'primary',
                  'whitespace-nowrap gap-1.5 px-2 text-xs sm:gap-2 sm:px-4 sm:text-sm',
                )}
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                繼續練習
              </Link>
              <Button
                variant="secondary"
                onClick={() => void handleFinish(activeSession.id)}
                loading={finishingId === activeSession.id}
                disabled={finishMutation.isPending}
                className="whitespace-nowrap gap-1.5 px-2 text-xs sm:gap-2 sm:px-4 sm:text-sm"
              >
                結束本場
              </Button>
            </>
          ) : (
            <Button
              onClick={() => {
                setActionError(null)
                setStartOpen(true)
              }}
              disabled={practiceDisabled}
              className="whitespace-nowrap gap-1.5 px-2 text-xs sm:gap-2 sm:px-4 sm:text-sm"
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              開始練習
            </Button>
          )
        }
      />

      {set.questionCount === 0 ? (
        <p className="mt-3 text-xs text-muted">此題庫沒有題目，請先重新匯入。</p>
      ) : activeSession ? (
        <p className="mt-3 text-xs text-muted">
          目前有一場練習進行中，結束後才能開始新的練習。
        </p>
      ) : (
        <p className="mt-3 text-xs text-muted">
          開始練習時可選擇範圍、順序與題數；每次練習都會保留紀錄。
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="題數" value={`${set.questionCount}`} hint={`${set.topicCount} 個主題`} />
        <StatCard
          label="正確率"
          value={formatPercentValue(set.accuracy)}
          hint={`已答 ${set.answeredCount} 題`}
        />
        <StatCard label="標記" value={`${markedCount}`} hint="已標記題目" />
      </div>

      <Card className="mt-6 p-5 sm:p-6">
        <h2 className="font-serif text-xl text-ink">主題分布</h2>
        <div className="mt-5">
          <TopicCounts topics={set.topics} />
        </div>
      </Card>

      {questions.length > 0 && (
        <Card className="mt-6 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-serif text-xl text-ink">題目瀏覽</h2>
              <p className="mt-1 text-sm text-muted">
                共 {questions.length} 題，可搜尋題幹、選項或解析，展開後查看答案與解析。
              </p>
            </div>
            <Link
              to={`/sets/${set.id}/questions`}
              className={buttonStyles('secondary', 'shrink-0')}
            >
              <ListOrdered className="h-4 w-4" aria-hidden="true" />
              瀏覽題目
            </Link>
          </div>
        </Card>
      )}

      {activeSession && practiceHref && (
        <Card className="mt-6 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">練習狀態</p>
              <h2 className="mt-1 font-serif text-xl text-ink">
                {activeSession.answered > 0
                  ? `上次練到第 ${activeSession.answered + 1} 題`
                  : '尚未開始作答'}
              </h2>
              <p className="mt-1 text-sm text-muted">
                已答 {activeSession.answered} / {activeSession.total} 題
              </p>
            </div>
            <Link to={practiceHref} className={buttonStyles('primary')}>
              繼續練習
            </Link>
          </div>
          <div className="mt-5">
            <ProgressBar
              answered={activeSession.answered}
              total={activeSession.total}
              label="目前進度"
            />
          </div>
        </Card>
      )}

      <Card className="mt-6 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-xl text-ink">練習紀錄</h2>
          {setSessions.length > 0 && (
            <Button
              variant="ghost"
              onClick={() => setClearOpen(true)}
              disabled={clearSessionsMutation.isPending}
              className="shrink-0 gap-1.5 text-xs"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              清除全部
            </Button>
          )}
        </div>
        <p className="mt-1 text-sm text-muted">
          每次練習都會保留，統計為所有場次累計。
        </p>

        {setSessions.length === 0 ? (
          <p className="mt-4 text-sm text-muted">還沒有練習紀錄。</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {setSessions.map((session) => {
              const accuracy =
                session.answered > 0
                  ? (session.correct / session.answered) * 100
                  : 0

              return (
                <li
                  key={session.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm text-ink">
                      {formatShortDateTime(session.startedAt)}
                      <span
                        className={
                          session.status === 'completed'
                            ? 'rounded-full bg-correct-soft px-2 py-0.5 text-[11px] font-medium text-correct'
                            : 'rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent'
                        }
                      >
                        {session.status === 'completed' ? '已完成' : '進行中'}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {modeLabels[session.mode]} · {session.answered} / {session.total} 題 · 正確率{' '}
                      {formatPercentValue(accuracy)}
                    </p>
                  </div>
                  <ActionMenu
                    className="ml-auto"
                    label={`${formatShortDateTime(session.startedAt)} 的練習操作`}
                    items={[
                      { label: '查看摘要', href: `/results/${session.id}` },
                      {
                        label: '刪除',
                        danger: true,
                        onSelect: () => setSessionToDelete(session),
                      },
                    ]}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Card className="mt-6 p-5 sm:p-6">
        <h2 className="font-serif text-xl text-ink">題庫操作</h2>
        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          <Button variant="secondary" onClick={() => setSyncOpen(true)}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            更新題庫
          </Button>
          <Button
            variant="secondary"
            onClick={() => void handleExport()}
            loading={exporting}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            匯出 JSON
          </Button>
          <Button variant="secondary" onClick={openRename}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
            重新命名
          </Button>
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            刪除題庫
          </Button>
        </div>
        {actionError && (
          <p className="mt-3 text-sm text-wrong" role="alert">
            {actionError}
          </p>
        )}
        <p className="mt-3 text-xs leading-5 text-muted">
          更新題庫以題號比對題目，會保留未變動題目的作答進度；匯出的 JSON 可直接作為更新來源。
        </p>
      </Card>

      <StartPracticeDialog
        open={startOpen}
        title={set.title}
        totalQuestions={set.questionCount}
        sessions={setSessions}
        onClose={() => setStartOpen(false)}
        onStart={handleStart}
      />

      <Modal
        open={renameOpen}
        onClose={() => {
          if (!renameMutation.isPending) setRenameOpen(false)
        }}
        title="重新命名題庫"
        description="修改後，列表與標記頁會同步顯示新名稱。"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setRenameOpen(false)}
              disabled={renameMutation.isPending}
            >
              取消
            </Button>
            <Button onClick={() => void handleRename()} loading={renameMutation.isPending}>
              儲存
            </Button>
          </>
        }
      >
        <label htmlFor="rename-title" className="text-sm font-medium text-ink">
          題庫標題
        </label>
        <input
          id="rename-title"
          value={renameTitle}
          onChange={(event) => setRenameTitle(event.target.value)}
          className="mt-2 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      </Modal>

      <SyncDialog
        open={syncOpen}
        setTitle={set.title}
        onClose={() => setSyncOpen(false)}
        buildPlan={buildSyncPlan}
        onSync={handleSync}
      />

      <ConfirmDialog
        open={sessionToDelete !== null}
        title="刪除練習紀錄"
        description={`確定要刪除這筆練習紀錄嗎？該場 ${sessionToDelete?.answered ?? 0} 題的作答會一併移除，題目標記不受影響。`}
        confirmLabel="刪除"
        confirmLoading={deleteSessionMutation.isPending}
        cancelDisabled={deleteSessionMutation.isPending}
        onCancel={() => setSessionToDelete(null)}
        onConfirm={() => void handleDeleteSession()}
      />

      <ConfirmDialog
        open={clearOpen}
        title="清除全部練習紀錄"
        description={`確定要清除「${set.title}」的所有練習紀錄嗎？作答與統計會一併移除，題目標記不受影響。`}
        confirmLabel="清除全部"
        confirmLoading={clearSessionsMutation.isPending}
        cancelDisabled={clearSessionsMutation.isPending}
        onCancel={() => setClearOpen(false)}
        onConfirm={() => void handleClearSessions()}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="刪除題庫"
        description={`確定要刪除「${set.title}」嗎？題目、標記與相關統計會一併移除。`}
        confirmLabel="刪除"
        confirmLoading={deleteMutation.isPending}
        cancelDisabled={deleteMutation.isPending}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </>
  )
}
