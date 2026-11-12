import { useRef, useState, type DragEvent } from 'react'
import { ClipboardPaste, FileJson, UploadCloud } from 'lucide-react'
import { Button } from './Button'
import { Modal } from './Modal'
import { cn } from '../lib/cn'
import { parseImportPreview, type ImportPreview } from '../lib/importPreview'

type ImportDialogProps = {
  open: boolean
  onClose: () => void
  onImport: (preview: ImportPreview) => void
}

type Tab = 'file' | 'paste'

export function ImportDialog({ open, onClose, onImport }: ImportDialogProps) {
  const [tab, setTab] = useState<Tab>('file')
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setTab('file')
    setText('')
    setFileName('')
    setPreview(null)
    setError(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function applyText(value: string) {
    setText(value)
    if (!value.trim()) {
      setPreview(null)
      setError(null)
      return
    }

    const result = parseImportPreview(value)
    setPreview(result.preview)
    setError(result.error)
  }

  async function handleFile(file: File) {
    setFileName(file.name)
    const content = await file.text()
    applyText(content)
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file) void handleFile(file)
  }

  function handleImport() {
    if (!preview) return
    onImport(preview)
    handleClose()
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
          <Button variant="secondary" onClick={handleClose}>
            取消
          </Button>
          <Button onClick={handleImport} disabled={!preview}>
            開始匯入
          </Button>
        </>
      }
    >
      <div className="flex gap-1 rounded-lg border border-line bg-paper p-1" role="tablist" aria-label="匯入方式">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'file'}
          onClick={() => setTab('file')}
          className={cn(
            'flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md px-3 text-sm transition-colors',
            tab === 'file' ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink',
          )}
        >
          <FileJson className="h-4 w-4" aria-hidden="true" />
          上傳檔案
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'paste'}
          onClick={() => setTab('paste')}
          className={cn(
            'flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md px-3 text-sm transition-colors',
            tab === 'paste' ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink',
          )}
        >
          <ClipboardPaste className="h-4 w-4" aria-hidden="true" />
          貼上 JSON
        </button>
      </div>

      {tab === 'file' ? (
        <div className="mt-4">
          <input
            ref={inputRef}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void handleFile(file)
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
            className="flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-line bg-paper px-5 py-10 text-center transition-colors hover:border-accent/60 hover:bg-accent-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <UploadCloud className="h-7 w-7 text-muted" aria-hidden="true" />
            <span className="mt-3 text-sm font-medium text-ink">選擇 JSON 檔或拖曳到這裡</span>
            <span className="mt-1 text-xs text-muted">
              {fileName || '支援單一題庫檔，最大 10MB'}
            </span>
          </button>
        </div>
      ) : (
        <div className="mt-4">
          <label htmlFor="import-json" className="text-sm font-medium text-ink">
            JSON 內容
          </label>
          <textarea
            id="import-json"
            value={text}
            onChange={(event) => applyText(event.target.value)}
            rows={8}
            placeholder='[{"question_number": 1, "topic": 1, "question": "...", "options": {...}, "correct_answers": ["A"], "explanation": "..."}]'
            className="mt-2 w-full resize-y rounded-lg border border-line bg-paper px-3 py-2.5 font-mono text-xs leading-6 text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-lg border border-wrong/30 bg-wrong-soft px-3 py-2 text-sm text-wrong" role="alert">
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
            目前為前端介面預覽，匯入後會建立一張示範題庫卡片，題目內容尚未寫入資料庫。
          </p>
        </div>
      )}
    </Modal>
  )
}
