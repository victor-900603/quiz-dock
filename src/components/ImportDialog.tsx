import { useState } from 'react'
import { Button } from './Button'
import { JsonSourcePicker, type JsonSourceValue } from './JsonSourcePicker'
import { Modal } from './Modal'
import { parseImportPreview, type ImportPreview } from '../lib/importPreview'
import type { ImportPayload } from '../schemas/import'

type ImportDialogProps = {
  open: boolean
  onClose: () => void
  onImport: (payload: ImportPayload) => Promise<void> | void
}

const JSON_PLACEHOLDER =
  '[{"question_number": 1, "topic": 1, "question": "...", "options": {...}, "correct_answers": ["A"], "explanation": "..."}]'

export function ImportDialog({ open, onClose, onImport }: ImportDialogProps) {
  const [source, setSource] = useState({ text: '', fileName: '' })
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resetKey, setResetKey] = useState(0)

  function reset() {
    setSource({ text: '', fileName: '' })
    setPreview(null)
    setError(null)
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

    if (next.error) {
      setPreview(null)
      setError(next.error)
      return
    }

    if (!next.text.trim()) {
      setPreview(null)
      setError(null)
      return
    }

    const result = parseImportPreview(next.text, next.fileName)
    setPreview(result.preview)
    setError(result.error)
  }

  async function handleImport() {
    if (!preview || submitting) return

    setSubmitting(true)
    setError(null)

    try {
      await onImport({
        text: source.text,
        fileName: source.fileName,
        title: preview.title.trim() || '未命名題庫',
      })
      setSubmitting(false)
      reset()
      onClose()
    } catch (importError) {
      setSubmitting(false)
      setError(importError instanceof Error ? importError.message : '匯入失敗，請稍後再試。')
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="匯入題庫"
      description="上傳 JSON 檔或貼上內容，確認題數與主題後建立題庫。"
      className="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={submitting}>
            取消
          </Button>
          <Button
            onClick={() => void handleImport()}
            disabled={!preview || submitting}
            loading={submitting}
          >
            {submitting ? '匯入中...' : '開始匯入'}
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

      {error && (
        <p className="mt-4 whitespace-pre-line rounded-lg border border-wrong/30 bg-wrong-soft px-3 py-2 text-sm text-wrong" role="alert">
          {error}
        </p>
      )}

      {preview && (
        <div className="mt-4 rounded-lg border border-line bg-paper p-4" role="status">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <label htmlFor="preview-title" className="text-xs text-muted">
                題庫標題
              </label>
              <input
                id="preview-title"
                value={preview.title}
                onChange={(event) => setPreview({ ...preview, title: event.target.value })}
                className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 font-serif text-lg text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <div className="rounded-md border border-line bg-surface px-3 py-2 text-center">
              <p className="font-mono text-lg text-ink">{preview.questionCount}</p>
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted">題</p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs text-muted">主題分布</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {preview.topics.map((topic) => (
                <span
                  key={topic.name}
                  className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-muted"
                >
                  {topic.name} · {topic.count}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs text-muted">前 3 題摘要</p>
            <ol className="mt-2 space-y-2">
              {preview.sample.map((sample, index) => (
                <li key={`${sample}-${index}`} className="flex gap-2 text-sm leading-6 text-ink">
                  <span className="font-mono text-xs text-muted">{String(index + 1).padStart(2, '0')}</span>
                  <span className="min-w-0">{sample || '（沒有題幹）'}</span>
                </li>
              ))}
            </ol>
          </div>

          <p className="mt-4 text-xs leading-5 text-muted">
            確認後會寫入資料庫，建立題庫與題目；相同內容的題庫不會重複匯入。
          </p>
        </div>
      )}
    </Modal>
  )
}
