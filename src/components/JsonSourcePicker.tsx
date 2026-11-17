import { useId, useRef, useState, type DragEvent } from 'react'
import { ClipboardPaste, FileJson, UploadCloud } from 'lucide-react'
import { cn } from '../lib/cn'
import { decodeTextBytes } from '../lib/csvImport'
import { IMPORT_LIMITS } from '../schemas/import'

export type JsonSourceValue = {
  text: string
  fileName: string
  error: string | null
}

type JsonSourcePickerProps = {
  text: string
  fileName: string
  disabled?: boolean
  placeholder?: string
  onSourceChange: (value: JsonSourceValue) => void
}

type Tab = 'file' | 'paste'

const SIZE_ERROR = '檔案過大，請確認檔案小於 10MB。'

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length
}

export function JsonSourcePicker({
  text,
  fileName,
  disabled = false,
  placeholder,
  onSourceChange,
}: JsonSourcePickerProps) {
  const [tab, setTab] = useState<Tab>('file')
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaId = useId()

  function emit(value: string, name: string, error: string | null) {
    onSourceChange({ text: value, fileName: name, error })
  }

  function applyText(value: string, name = '') {
    if (!value.trim()) {
      emit('', name, null)
      return
    }

    if (byteLength(value) > IMPORT_LIMITS.fileBytes) {
      emit(value, name, SIZE_ERROR)
      return
    }

    emit(value, name, null)
  }

  async function handleFile(file: File) {
    if (file.size > IMPORT_LIMITS.fileBytes) {
      emit('', file.name, SIZE_ERROR)
      return
    }

    const content =
      typeof file.arrayBuffer === 'function'
        ? decodeTextBytes(await file.arrayBuffer())
        : await file.text()
    applyText(content, file.name)
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    if (disabled) return

    const file = event.dataTransfer.files[0]
    if (file) void handleFile(file)
  }

  return (
    <>
      <div
        className="flex gap-1 rounded-lg border border-line bg-paper p-1"
        role="tablist"
        aria-label="匯入方式"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'file'}
          disabled={disabled}
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
          disabled={disabled}
          onClick={() => setTab('paste')}
          className={cn(
            'flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md px-3 text-sm transition-colors',
            tab === 'paste' ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink',
          )}
        >
          <ClipboardPaste className="h-4 w-4" aria-hidden="true" />
          貼上內容
        </button>
      </div>

      {tab === 'file' ? (
        <div className="mt-4">
          <input
            ref={inputRef}
            type="file"
            accept=".json,.csv,.tsv,application/json,text/csv,text/tab-separated-values"
            className="sr-only"
            disabled={disabled}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void handleFile(file)
            }}
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
            className="flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-line bg-paper px-5 py-10 text-center transition-colors hover:border-accent/60 hover:bg-accent-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <UploadCloud className="h-7 w-7 text-muted" aria-hidden="true" />
            <span className="mt-3 text-sm font-medium text-ink">
              選擇題庫檔或拖曳到這裡
            </span>
            <span className="mt-1 text-xs text-muted">
              {fileName || '支援 JSON、CSV 與 TSV，最大 10MB'}
            </span>
          </button>
        </div>
      ) : (
        <div className="mt-4">
          <label htmlFor={textareaId} className="text-sm font-medium text-ink">
            內容
          </label>
          <textarea
            id={textareaId}
            value={text}
            disabled={disabled}
            onChange={(event) => applyText(event.target.value)}
            rows={8}
            placeholder={placeholder}
            className="mt-2 w-full resize-y rounded-lg border border-line bg-paper px-3 py-2.5 font-mono text-xs leading-6 text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
      )}
    </>
  )
}
