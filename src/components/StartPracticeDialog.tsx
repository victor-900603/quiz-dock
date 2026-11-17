import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Button } from './Button'
import { Modal } from './Modal'
import { formatShortDateTime } from '../lib/format'
import type { PracticeMode, PracticeProgress } from '../types/quiz'

export type StartPracticeOptions = {
  mode: PracticeMode
  limit: number | null
  sourceSessionId: string | null
}

type StartPracticeDialogProps = {
  open: boolean
  title: string
  totalQuestions: number
  sessions: PracticeProgress[]
  onClose: () => void
  onStart: (options: StartPracticeOptions) => Promise<void> | void
}

type Scope = 'all' | 'wrong'
type Size = 'all' | 'custom'

const QUICK_LIMITS = [10, 20, 50]

function wrongCount(session: PracticeProgress): number {
  return Math.max(session.answered - session.correct, 0)
}

export function StartPracticeDialog({
  open,
  title,
  totalQuestions,
  sessions,
  onClose,
  onStart,
}: StartPracticeDialogProps) {
  const wrongSessions = useMemo(
    () =>
      sessions.filter(
        (session) => session.status === 'completed' && wrongCount(session) > 0,
      ),
    [sessions],
  )
  const [scope, setScope] = useState<Scope>('all')
  const [sourceSessionId, setSourceSessionId] = useState('')
  const [mode, setMode] = useState<PracticeMode>('sequential')
  const [size, setSize] = useState<Size>('all')
  const [customLimit, setCustomLimit] = useState('20')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return

    setScope('all')
    setSourceSessionId(wrongSessions[0]?.id ?? '')
    setMode('sequential')
    setSize('all')
    setCustomLimit(String(Math.min(20, Math.max(totalQuestions, 1))))
    setError('')
    setSubmitting(false)
  }, [open, totalQuestions, wrongSessions])

  const selectedSource = wrongSessions.find(
    (session) => session.id === sourceSessionId,
  )
  const maxQuestions =
    scope === 'wrong'
      ? (selectedSource ? wrongCount(selectedSource) : 0)
      : totalQuestions

  function chooseScope(nextScope: Scope) {
    setScope(nextScope)
    setError('')
    if (nextScope === 'wrong' && !sourceSessionId) {
      setSourceSessionId(wrongSessions[0]?.id ?? '')
    }
  }

  async function handleStart(event?: FormEvent) {
    event?.preventDefault()
    setError('')

    if (scope === 'wrong' && !sourceSessionId) {
      setError('請選擇要重練的練習紀錄。')
      return
    }

    let limit: number | null = null
    if (size === 'custom') {
      const parsed = Number(customLimit)
      if (!Number.isInteger(parsed) || parsed < 1) {
        setError('請輸入有效的題數。')
        return
      }

      if (parsed > maxQuestions) {
        setError(`題數不可超過 ${maxQuestions} 題。`)
        return
      }

      limit = parsed
    }

    setSubmitting(true)
    try {
      await onStart({
        mode,
        limit,
        sourceSessionId: scope === 'wrong' ? sourceSessionId : null,
      })
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : '無法開始練習，請稍後再試。',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="開始練習"
      description="選擇範圍、順序與題數，開始後會建立一筆新的練習紀錄。"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            取消
          </Button>
          <Button onClick={() => void handleStart()} loading={submitting}>
            開始練習
          </Button>
        </>
      }
    >
      <form className="space-y-5" onSubmit={(event) => void handleStart(event)}>
        <p className="text-sm text-muted">
          {title} · 共 {totalQuestions} 題
        </p>

        <fieldset>
          <legend className="text-sm font-medium text-ink">範圍</legend>
          <div className="mt-2 space-y-2">
            <label className="flex items-start gap-2 text-sm text-ink">
              <input
                type="radio"
                name="practice-scope"
                className="mt-1 accent-accent"
                checked={scope === 'all'}
                onChange={() => chooseScope('all')}
              />
              <span>
                全部題目
                <span className="text-muted">（{totalQuestions} 題）</span>
              </span>
            </label>
            <label
              className={
                wrongSessions.length === 0
                  ? 'flex items-start gap-2 text-sm text-muted'
                  : 'flex items-start gap-2 text-sm text-ink'
              }
            >
              <input
                type="radio"
                name="practice-scope"
                className="mt-1 accent-accent"
                checked={scope === 'wrong'}
                disabled={wrongSessions.length === 0}
                onChange={() => chooseScope('wrong')}
              />
              <span>
                某次練習的錯題
                <span className="text-muted">
                  {wrongSessions.length === 0
                    ? '（尚無含錯題的已完成練習）'
                    : `（${wrongSessions.length} 場可選）`}
                </span>
              </span>
            </label>
          </div>

          {scope === 'wrong' && wrongSessions.length > 0 && (
            <div className="mt-3">
              <label
                htmlFor="practice-source-session"
                className="text-xs font-medium text-muted"
              >
                錯題來源
              </label>
              <select
                id="practice-source-session"
                className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                value={sourceSessionId}
                onChange={(event) => {
                  setSourceSessionId(event.target.value)
                  setError('')
                }}
              >
                {wrongSessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {formatShortDateTime(session.completedAt ?? session.startedAt)}
                    {` · 答對 ${session.correct} / ${session.answered} 題`}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted">
                只會挑出該場答錯的 {maxQuestions} 題。
              </p>
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium text-ink">順序</legend>
          <div className="mt-2 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="radio"
                name="practice-mode"
                className="accent-accent"
                checked={mode === 'sequential'}
                onChange={() => setMode('sequential')}
              />
              依序
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="radio"
                name="practice-mode"
                className="accent-accent"
                checked={mode === 'random'}
                onChange={() => setMode('random')}
              />
              隨機
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium text-ink">題數</legend>
          <div className="mt-2 space-y-2">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="radio"
                name="practice-size"
                className="accent-accent"
                checked={size === 'all'}
                onChange={() => {
                  setSize('all')
                  setError('')
                }}
              />
              全部（{maxQuestions} 題）
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="radio"
                name="practice-size"
                className="accent-accent"
                checked={size === 'custom'}
                onChange={() => {
                  setSize('custom')
                  setError('')
                }}
              />
              自訂題數
            </label>

            {size === 'custom' && (
              <div className="pl-6">
                <input
                  type="number"
                  aria-label="題數"
                  min={1}
                  max={maxQuestions}
                  className="w-28 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                  value={customLimit}
                  onChange={(event) => {
                    setCustomLimit(event.target.value)
                    setError('')
                  }}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {QUICK_LIMITS.filter((value) => value <= maxQuestions).map(
                    (value) => (
                      <Button
                        key={value}
                        type="button"
                        variant="secondary"
                        className="min-h-8 px-2.5 py-1 text-xs"
                        onClick={() => {
                          setCustomLimit(String(value))
                          setError('')
                        }}
                      >
                        {value} 題
                      </Button>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="text-sm text-wrong">
            {error}
          </p>
        )}
      </form>
    </Modal>
  )
}
