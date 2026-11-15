import { useEffect, useRef, useState } from 'react'
import { Button } from './Button'
import { JsonSourcePicker, type JsonSourceValue } from './JsonSourcePicker'
import { Modal } from './Modal'
import type { ImportPayload } from '../schemas/import'
import type { SyncPlan } from '../features/library/syncService'

type SyncDialogProps = {
  open: boolean
  setTitle: string
  onClose: () => void
  buildPlan: (payload: ImportPayload) => Promise<SyncPlan>
  onSync: (payload: ImportPayload) => Promise<void> | void
}

const JSON_PLACEHOLDER =
  '[{"question_number": 1, "topic": 1, "question": "...", "options": {...}, "correct_answers": ["A"], "explanation": "..."}]'

const PREVIEW_DELAY_MS = 250

export function SyncDialog({
  open,
  setTitle,
  onClose,
  buildPlan,
  onSync,
}: SyncDialogProps) {
  const [source, setSource] = useState({ text: '', fileName: '' })
  const [sourceError, setSourceError] = useState<string | null>(null)
  const [plan, setPlan] = useState<SyncPlan | null>(null)
  const [planError, setPlanError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const buildPlanRef = useRef(buildPlan)
  buildPlanRef.current = buildPlan

  useEffect(() => {
    if (!open) return

    if (!source.text.trim() || sourceError) {
      setPlan(null)
      setPlanError(null)
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    setPlanError(null)

    const timer = window.setTimeout(() => {
      buildPlanRef
        .current({
          text: source.text,
          fileName: source.fileName,
          title: setTitle,
        })
        .then((next) => {
          if (!active) return
          setPlan(next)
          setLoading(false)
        })
        .catch((error: unknown) => {
          if (!active) return
          setPlan(null)
          setPlanError(
            error instanceof Error ? error.message : '無法比對題庫差異，請稍後再試。',
          )
          setLoading(false)
        })
    }, PREVIEW_DELAY_MS)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [open, source.text, source.fileName, sourceError, setTitle])

  function reset() {
    setSource({ text: '', fileName: '' })
    setSourceError(null)
    setPlan(null)
    setPlanError(null)
    setLoading(false)
    setSubmitting(false)
    setResetKey((value) => value + 1)
  }

  function handleClose() {
    if (submitting) return
    reset()
    onClose()
  }

  function applySource(next: JsonSourceValue) {
    setSource({ text: next.text, fileName: next.fileName })
    setSourceError(next.error)
  }

  async function handleSync() {
    if (!plan || submitting) return

    setSubmitting(true)
    setPlanError(null)

    try {
      await onSync({
        text: source.text,
        fileName: source.fileName,
        title: setTitle,
      })
      setSubmitting(false)
      reset()
      onClose()
    } catch (error) {
      setSubmitting(false)
      setPlanError(
        error instanceof Error ? error.message : '更新失敗，請稍後再試。',
      )
    }
  }

  const changeCount = plan
    ? plan.added.length +
      plan.updated.length +
      plan.reordered.length +
      plan.removed.length
    : 0

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="更新題庫"
      description="上傳新版 JSON，以題號比對題目後保留練習進度。"
      className="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={submitting}>
            取消
          </Button>
          <Button
            onClick={() => void handleSync()}
            disabled={!plan || changeCount === 0 || loading || submitting}
            loading={submitting}
          >
            {submitting ? '更新中...' : '確認更新'}
          </Button>
        </>
      }
    >
      <JsonSourcePicker
        key={resetKey}
        text={source.text}
        fileName={source.fileName}
        disabled={submitting}
        placeholder={JSON_PLACEHOLDER}
        onSourceChange={applySource}
      />

      <p className="mt-4 text-xs leading-5 text-muted">
        相同題號視為同一題並更新內容，新題號會新增，未出現的題號會刪除；未變動的題目保留作答進度。
      </p>

      {sourceError && (
        <p className="mt-4 rounded-lg border border-wrong/30 bg-wrong-soft px-3 py-2 text-sm text-wrong" role="alert">
          {sourceError}
        </p>
      )}

      {loading && (
        <p className="mt-4 text-sm text-muted" role="status">
          正在比對差異…
        </p>
      )}

      {planError && (
        <p className="mt-4 whitespace-pre-line rounded-lg border border-wrong/30 bg-wrong-soft px-3 py-2 text-sm text-wrong" role="alert">
          {planError}
        </p>
      )}

      {plan && !loading && (
        <div className="mt-4 rounded-lg border border-line bg-paper p-4" role="status">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <Metric label="題數" value={plan.totalCount} />
            <Metric label="新增" value={plan.added.length} tone="added" />
            <Metric label="修改" value={plan.updated.length} tone="changed" />
            <Metric label="順序調整" value={plan.reordered.length} />
            <Metric label="移除" value={plan.removed.length} tone="removed" />
            <Metric label="未變更" value={plan.unchangedCount} />
          </div>

          {changeCount === 0 && (
            <p className="mt-4 text-sm text-muted">內容與目前的題庫相同，不需要更新。</p>
          )}

          {plan.updated.length > 0 && (
            <p className="mt-4 text-sm leading-6 text-ink">
              有 {plan.updated.length} 題內容變動，會重新計算這些題目已作答紀錄的正確性（
              {plan.updatedAttemptCount} 筆）。
            </p>
          )}

          {plan.removed.length > 0 && (
            <div className="mt-4">
              <p className="text-sm leading-6 text-ink">
                移除 {plan.removed.length} 題會一併刪除 {plan.removedAttemptCount} 筆作答與{' '}
                {plan.removedMarkCount} 個標記，無法復原。
              </p>
              <ul className="mt-2 space-y-1 text-xs leading-5 text-muted">
                {plan.removed.slice(0, 5).map((question) => (
                  <li key={question.id}>
                    第 {question.questionNumber} 題：{question.question || '（沒有題幹）'}
                  </li>
                ))}
                {plan.removed.length > 5 && <li>另有 {plan.removed.length - 5} 題</li>}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: 'added' | 'changed' | 'removed'
}) {
  const toneClass =
    tone === 'added'
      ? 'text-correct'
      : tone === 'changed'
        ? 'text-accent'
        : tone === 'removed'
          ? 'text-wrong'
          : 'text-ink'

  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-xs text-muted">{label}</span>
      <span className={`font-mono text-base ${toneClass}`}>{value}</span>
    </span>
  )
}
