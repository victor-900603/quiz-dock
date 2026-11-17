import Papa from 'papaparse'
import { optionKey, stripBom } from './importSource'

export type RawCsvTable = {
  rows: string[][]
  columnCount: number
}

export type CsvMapping = {
  hasHeader: boolean
  question: number | null
  answer: number | null
  options: number[]
  number: number | null
  topic: number | null
  explanation: number | null
}

export type CsvQuestionsResult =
  | { questions: Record<string, unknown>[]; error: null }
  | { questions: []; error: string }

export function decodeTextBytes(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)

  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(bytes.subarray(3))
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    try {
      return new TextDecoder('big5').decode(bytes)
    } catch {
      return new TextDecoder('utf-8').decode(bytes)
    }
  }
}

export function detectFormat(fileName: string, text: string): 'json' | 'csv' {
  if (/\.(csv|tsv)$/i.test(fileName)) return 'csv'

  const trimmed = text.trimStart()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json'
  if (text.includes('\n') && /[\t,]/.test(text)) return 'csv'

  return 'json'
}

export function parseCsv(text: string): RawCsvTable | null {
  const result = Papa.parse<string[]>(stripBom(text), {
    skipEmptyLines: 'greedy',
  })

  const rows = result.data
    .map((row) => row.map((cell) => String(cell ?? '').trim()))
    .filter((row) => row.some((cell) => cell !== ''))

  if (rows.length === 0) return null

  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0)

  return {
    rows: rows.map((row) => [
      ...row,
      ...Array<string>(Math.max(0, columnCount - row.length)).fill(''),
    ]),
    columnCount,
  }
}

export function csvHeaders(table: RawCsvTable, hasHeader: boolean): string[] {
  if (hasHeader && table.rows[0]) {
    return table.rows[0].map((header, index) => header || `欄位 ${index + 1}`)
  }

  return Array.from({ length: table.columnCount }, (_, index) => `欄位 ${index + 1}`)
}

function findColumn(
  headers: string[],
  pattern: RegExp,
  exclude: number[] = [],
): number | null {
  const index = headers.findIndex(
    (header, column) => !exclude.includes(column) && pattern.test(header),
  )

  return index >= 0 ? index : null
}

export function guessCsvMapping(
  table: RawCsvTable,
  hasHeader = true,
): CsvMapping {
  const headers = csvHeaders(table, hasHeader)
  const question = findColumn(headers, /題幹|題目|question|stem|prompt|content/i)
  const answer = findColumn(headers, /答案|answer|correct/i, question != null ? [question] : [])
  const number = findColumn(headers, /題號|編號|number|^no\.?$|^#$/i)
  const topic = findColumn(headers, /主題|分類|topic|subject|category/i)
  const explanation = findColumn(headers, /解析|說明|explanation|rationale|analysis/i)

  const reserved = [question, answer, number, topic, explanation].filter(
    (value): value is number => value !== null,
  )
  const options = headers
    .map((header, column) => ({ header, column }))
    .filter(
      ({ header, column }) =>
        !reserved.includes(column) &&
        /^(選項\s*)?([A-Z]|[0-9]+)$/i.test(header.trim()),
    )
    .map(({ column }) => column)

  if (!hasHeader && table.columnCount >= 4) {
    return {
      hasHeader,
      question: 0,
      answer: table.columnCount - 1,
      options: Array.from({ length: table.columnCount - 2 }, (_, index) => index + 1),
      number: null,
      topic: null,
      explanation: null,
    }
  }

  return {
    hasHeader,
    question,
    answer,
    options,
    number,
    topic,
    explanation,
  }
}

function cell(row: string[], column: number | null): string {
  if (column === null) return ''
  return row[column] ?? ''
}

export function buildCsvQuestions(
  table: RawCsvTable,
  mapping: CsvMapping,
): CsvQuestionsResult {
  if (mapping.question === null || mapping.answer === null) {
    return { questions: [], error: '請選擇題幹與答案欄位。' }
  }

  if (mapping.options.length < 2) {
    return { questions: [], error: '請至少選擇 2 個選項欄位。' }
  }

  const rows = table.rows.slice(mapping.hasHeader ? 1 : 0)
  const questions: Record<string, unknown>[] = []

  for (const row of rows) {
    const question = cell(row, mapping.question)
    const options = mapping.options
      .map((column) => cell(row, column))
      .filter((text) => text !== '')
      .map((text, index) => ({ key: optionKey(index), text }))

    if (!question && options.length === 0) continue

    questions.push({
      question_number: cell(row, mapping.number) || undefined,
      topic: cell(row, mapping.topic) || undefined,
      question,
      options,
      correct_answers: cell(row, mapping.answer),
      explanation: cell(row, mapping.explanation) || undefined,
    })
  }

  if (questions.length === 0) {
    return { questions: [], error: 'CSV 沒有可匯入的資料列。' }
  }

  return { questions, error: null }
}
