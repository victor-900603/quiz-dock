import { useState } from 'react'
import {
  ArrowLeft,
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
import { TopicBars } from '../../components/TopicBars'
import { formatPercentValue } from '../../lib/format'
import { useMockStore } from '../../lib/mockStore'

export function SetDetailPage() {
  const { setId } = useParams()
  const navigate = useNavigate()
  const { sets, marks, renameSet, removeSet } = useMockStore()
  const set = sets.find((item) => item.id === setId)
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [renameTitle, setRenameTitle] = useState(set?.title ?? '')

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

  const markedCount = marks.filter((mark) => mark.setId === set.id).length
  const activeSession = set.activeSession
  const practiceHref = activeSession
    ? `/practice/${activeSession.id}?setId=${set.id}&mode=${activeSession.mode}&resume=1`
    : `/practice/demo-session?setId=${set.id}&mode=sequential`

  function openRename() {
    setRenameTitle(set?.title ?? '')
    setRenameOpen(true)
  }

  function handleRename() {
    const nextTitle = renameTitle.trim()
    if (!nextTitle) return
    renameSet(set!.id, nextTitle)
    setRenameOpen(false)
  }

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
            <Link
              to={practiceHref}
              className={buttonStyles(
                'primary',
                'whitespace-nowrap gap-1.5 px-1.5 text-xs sm:gap-2 sm:px-4 sm:text-sm',
              )}
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              {activeSession ? '繼續練習' : '依序練習'}
            </Link>
            <Link
              to={`/practice/demo-session?setId=${set.id}&mode=random`}
              className={buttonStyles(
                'secondary',
                'whitespace-nowrap gap-1.5 px-1.5 text-xs sm:gap-2 sm:px-4 sm:text-sm',
              )}
            >
              <Shuffle className="h-4 w-4" aria-hidden="true" />
              隨機練習
            </Link>
            {activeSession && (
              <Link
                to={`/practice/demo-session?setId=${set.id}&mode=sequential`}
                className={buttonStyles(
                  'secondary',
                  'whitespace-nowrap gap-1.5 px-1.5 text-xs sm:gap-2 sm:px-4 sm:text-sm',
                )}
              >
                <ListOrdered className="h-4 w-4" aria-hidden="true" />
                重新開始
              </Link>
            )}
          </>
        }
      />

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
          <TopicBars topics={set.topics} />
        </div>
      </Card>

      {activeSession && (
        <Card className="mt-6 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">進行中</p>
              <h2 className="mt-1 font-serif text-xl text-ink">上次練到第 {activeSession.answered + 1} 題</h2>
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
        <p className="mt-3 text-xs leading-5 text-muted">
          P0 不顯示完整題目列表，避免一次載入大量題目。
        </p>
      </Card>

      <Modal
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        title="重新命名題庫"
        description="修改後，列表與標記頁會同步顯示新名稱。"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRenameOpen(false)}>
              取消
            </Button>
            <Button onClick={handleRename}>儲存</Button>
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
        open={deleteOpen}
        title="刪除題庫"
        description={`確定要刪除「${set.title}」嗎？題目、標記與相關統計會一併移除。`}
        confirmLabel="刪除"
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          removeSet(set.id)
          navigate('/')
        }}
      />
    </>
  )
}
