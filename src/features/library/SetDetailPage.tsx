import { useState } from 'react'
import {
  ArrowLeft,
  BarChart3,
  ListOrdered,
  Pencil,
  Play,
  Shuffle,
  Trash2,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, buttonStyles } from '../../components/Button'
import { Card } from '../../components/Card'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { EmptyState } from '../../components/EmptyState'
import { Modal } from '../../components/Modal'
import { PageHeader } from '../../components/PageHeader'
import { ProgressBar } from '../../components/ProgressBar'
import { StatCard } from '../../components/StatCard'
import { TopicCounts } from '../../components/TopicCounts'
import { formatPercentValue } from '../../lib/format'
import { useMockStore } from '../../lib/mockStore'
import type { PracticeMode } from '../../types/quiz'
import { useMarksQuery } from '../marks/queries'
import { usePracticeSessionsQuery, useStartPracticeMutation } from '../practice/queries'
import { useDeleteSetMutation, useRenameSetMutation, useSetQuery } from './queries'

export function SetDetailPage() {
  const { setId } = useParams()
  const navigate = useNavigate()
  const { renameSet, removeSet } = useMockStore()
  const marksQuery = useMarksQuery()
  const setQuery = useSetQuery(setId)
  const sessionsQuery = usePracticeSessionsQuery()
  const startMutation = useStartPracticeMutation()
  const renameMutation = useRenameSetMutation()
  const deleteMutation = useDeleteSetMutation()
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<
    { type: 'mode'; mode: PracticeMode } | { type: 'restart' } | null
  >(null)
  const [renameTitle, setRenameTitle] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [startIntent, setStartIntent] = useState<'mode' | 'restart' | null>(null)

  const set = setQuery.data?.set
  const progress = (sessionsQuery.data ?? []).find((item) => item.setId === set?.id)
  const practiceHref = progress
    ? `/practice/${progress.id}?setId=${progress.setId}&mode=${progress.mode}`
    : null
  const summaryHref = progress ? `/results/${progress.id}` : null

  function openRename() {
    setRenameTitle(set?.title ?? '')
    setActionError(null)
    setRenameOpen(true)
  }

  async function startPractice(
    mode: PracticeMode,
    restart: boolean,
    intent: 'mode' | 'restart',
  ) {
    if (!set) return

    setActionError(null)
    setStartIntent(intent)

    try {
      const session = await startMutation.mutateAsync({ setId: set.id, mode, restart })
      navigate(`/practice/${session.id}?setId=${set.id}&mode=${session.mode}`)
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : '無法開始練習，請稍後再試。',
      )
    } finally {
      setStartIntent(null)
    }
  }

  function requestMode(mode: PracticeMode) {
    if (!set || set.questionCount === 0) return

    if (!progress) {
      void startPractice(mode, false, 'mode')
      return
    }

    if (progress.mode === mode) {
      navigate(practiceHref as string)
      return
    }

    setPendingAction({ type: 'mode', mode })
  }

  function requestRestart() {
    if (!progress) return
    setPendingAction({ type: 'restart' })
  }

  function handlePendingConfirm() {
    if (!pendingAction || !set) return

    const mode =
      pendingAction.type === 'mode' ? pendingAction.mode : progress?.mode ?? 'sequential'
    const intent = pendingAction.type === 'mode' ? 'mode' : 'restart'
    setPendingAction(null)
    void startPractice(mode, true, intent)
  }

  async function handleRename() {
    if (!set) return

    const nextTitle = renameTitle.trim()
    if (!nextTitle) return

    setActionError(null)

    try {
      await renameMutation.mutateAsync({ setId: set.id, title: nextTitle })
      renameSet(set.id, nextTitle)
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
      removeSet(set.id)
      navigate('/')
    } catch (error) {
      setDeleteOpen(false)
      setActionError(error instanceof Error ? error.message : '刪除題庫失敗，請稍後再試。')
    }
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
  const answeredCount = progress?.answered ?? set.answeredCount
  const accuracy =
    progress && progress.answered > 0
      ? (progress.correct / progress.answered) * 100
      : set.accuracy
  const pendingMode = startMutation.isPending ? startMutation.variables?.mode : undefined
  const practiceDisabled = startMutation.isPending || set.questionCount === 0

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
        actionsClassName="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:flex-nowrap sm:items-center"
        actions={
          <>
            {progress ? (
              progress.status === 'completed' ? (
                <Link
                  to={summaryHref as string}
                  className={buttonStyles(
                    'primary',
                    'whitespace-nowrap gap-1.5 px-1.5 text-xs sm:gap-2 sm:px-4 sm:text-sm',
                  )}
                >
                  <BarChart3 className="h-4 w-4" aria-hidden="true" />
                  查看摘要
                </Link>
              ) : (
                <Link
                  to={practiceHref as string}
                  className={buttonStyles(
                    'primary',
                    'whitespace-nowrap gap-1.5 px-1.5 text-xs sm:gap-2 sm:px-4 sm:text-sm',
                  )}
                >
                  <Play className="h-4 w-4" aria-hidden="true" />
                  繼續練習
                </Link>
              )
            ) : (
              <Button
                onClick={() => requestMode('sequential')}
                loading={startIntent === 'mode' && pendingMode === 'sequential'}
                disabled={practiceDisabled}
                className="whitespace-nowrap gap-1.5 px-1.5 text-xs sm:gap-2 sm:px-4 sm:text-sm"
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                依序練習
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => requestMode('random')}
              loading={startIntent === 'mode' && pendingMode === 'random'}
              disabled={practiceDisabled}
              className="whitespace-nowrap gap-1.5 px-1.5 text-xs sm:gap-2 sm:px-4 sm:text-sm"
            >
              <Shuffle className="h-4 w-4" aria-hidden="true" />
              隨機練習
            </Button>
            {progress && (
              <Button
                variant="secondary"
                onClick={requestRestart}
                loading={startIntent === 'restart'}
                disabled={startMutation.isPending}
                className="whitespace-nowrap gap-1.5 px-1.5 text-xs sm:gap-2 sm:px-4 sm:text-sm"
              >
                <ListOrdered className="h-4 w-4" aria-hidden="true" />
                重新開始
              </Button>
            )}
          </>
        }
      />

      {set.questionCount === 0 ? (
        <p className="mt-3 text-xs text-muted">此題庫沒有題目，請先重新匯入。</p>
      ) : progress ? (
        <p className="mt-3 text-xs text-muted">
          切換模式或重新開始會清除這個題庫目前的作答與統計。
        </p>
      ) : (
        <p className="mt-3 text-xs text-muted">選擇練習模式後即可開始。</p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="題數" value={`${set.questionCount}`} hint={`${set.topicCount} 個主題`} />
        <StatCard
          label="正確率"
          value={formatPercentValue(accuracy)}
          hint={`已答 ${answeredCount} 題`}
        />
        <StatCard label="標記" value={`${markedCount}`} hint="已標記題目" />
      </div>

      <Card className="mt-6 p-5 sm:p-6">
        <h2 className="font-serif text-xl text-ink">主題分布</h2>
        <div className="mt-5">
          <TopicCounts topics={set.topics} />
        </div>
      </Card>

      {progress && practiceHref && (
        <Card className="mt-6 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">練習狀態</p>
              <h2 className="mt-1 font-serif text-xl text-ink">
                {progress.status === 'completed'
                  ? '已完成，可返回修改答案'
                  : progress.answered > 0
                    ? `上次練到第 ${progress.answered + 1} 題`
                    : '尚未開始作答'}
              </h2>
              <p className="mt-1 text-sm text-muted">
                已答 {progress.answered} / {progress.total} 題
              </p>
            </div>
            <Link to={practiceHref} className={buttonStyles('primary')}>
              {progress.status === 'completed' ? '返回修改' : '繼續練習'}
            </Link>
          </div>
          <div className="mt-5">
            <ProgressBar
              answered={progress.answered}
              total={progress.total}
              label="目前進度"
            />
          </div>
        </Card>
      )}

      <Card className="mt-6 p-5 sm:p-6">
        <h2 className="font-serif text-xl text-ink">題庫操作</h2>
        <div className="mt-4 flex flex-wrap gap-2">
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
          P0 不顯示完整題目列表，避免一次載入大量題目。
        </p>
      </Card>

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

      <ConfirmDialog
        open={pendingAction !== null}
        title={pendingAction?.type === 'mode' ? '切換模式' : '重新開始'}
        description="切換模式或重新開始會清除這個題庫目前的作答與統計，確定要繼續嗎？"
        confirmLabel={pendingAction?.type === 'mode' ? '切換模式' : '重新開始'}
        onCancel={() => setPendingAction(null)}
        onConfirm={handlePendingConfirm}
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
