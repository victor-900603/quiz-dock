import { useId } from 'react'
import type { CsvMapping, RawCsvTable } from '../lib/csvImport'
import { csvHeaders, guessCsvMapping } from '../lib/csvImport'

type CsvMappingFieldsProps = {
  table: RawCsvTable
  mapping: CsvMapping
  disabled?: boolean
  onChange: (mapping: CsvMapping) => void
}

type ColumnSelectProps = {
  label: string
  headers: string[]
  value: number | null
  allowNone?: boolean
  disabled?: boolean
  onChange: (value: number | null) => void
}

function ColumnSelect({
  label,
  headers,
  value,
  allowNone = false,
  disabled = false,
  onChange,
}: ColumnSelectProps) {
  const id = useId()

  return (
    <div>
      <label htmlFor={id} className="text-xs text-muted">
        {label}
      </label>
      <select
        id={id}
        aria-label={label}
        value={value === null ? '' : String(value)}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value === '' ? null : Number(event.target.value))
        }
        className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
      >
        <option value="">{allowNone ? '不指定' : '請選擇'}</option>
        {headers.map((header, index) => (
          <option key={`${header}-${index}`} value={index}>
            {header}
          </option>
        ))}
      </select>
    </div>
  )
}

export function CsvMappingFields({
  table,
  mapping,
  disabled = false,
  onChange,
}: CsvMappingFieldsProps) {
  const headers = csvHeaders(table, mapping.hasHeader)

  function toggleOption(column: number) {
    const options = mapping.options.includes(column)
      ? mapping.options.filter((value) => value !== column)
      : [...mapping.options, column].sort((left, right) => left - right)

    onChange({ ...mapping, options })
  }

  return (
    <div className="mt-4 rounded-lg border border-line bg-paper p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink">欄位對應</p>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={mapping.hasHeader}
            disabled={disabled}
            onChange={(event) =>
              onChange(guessCsvMapping(table, event.target.checked))
            }
          />
          第一列是標題
        </label>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <ColumnSelect
          label="題幹欄位"
          headers={headers}
          value={mapping.question}
          disabled={disabled}
          onChange={(question) => onChange({ ...mapping, question })}
        />
        <ColumnSelect
          label="答案欄位"
          headers={headers}
          value={mapping.answer}
          disabled={disabled}
          onChange={(answer) => onChange({ ...mapping, answer })}
        />
        <ColumnSelect
          label="題號欄位"
          headers={headers}
          value={mapping.number}
          allowNone
          disabled={disabled}
          onChange={(number) => onChange({ ...mapping, number })}
        />
        <ColumnSelect
          label="主題欄位"
          headers={headers}
          value={mapping.topic}
          allowNone
          disabled={disabled}
          onChange={(topic) => onChange({ ...mapping, topic })}
        />
        <ColumnSelect
          label="解析欄位"
          headers={headers}
          value={mapping.explanation}
          allowNone
          disabled={disabled}
          onChange={(explanation) => onChange({ ...mapping, explanation })}
        />
      </div>

      <fieldset className="mt-4">
        <legend className="text-xs text-muted">
          選項欄位（依勾選順序配 A、B、C…）
        </legend>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
          {headers.map((header, column) => (
            <label key={`${header}-${column}`} className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                aria-label={`選項欄位 ${header}`}
                checked={mapping.options.includes(column)}
                disabled={disabled}
                onChange={() => toggleOption(column)}
              />
              {header}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  )
}
