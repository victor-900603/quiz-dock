import { z } from 'zod'
import type { QuizOption } from '../types/quiz'
import {
  QUESTION_FIELD_ALIASES,
  extractImportSource,
  isRecord,
  optionKey,
  pickField,
  type RawImportSource,
} from '../lib/importSource'

export const IMPORT_LIMITS = {
  fileBytes: 10 * 1024 * 1024,
  questionCount: 5000,
  optionCount: 10,
  textLength: 20000,
} as const

export type ImportErrorCode =
  | 'INVALID_JSON'
  | 'INVALID_SHAPE'
  | 'EMPTY_QUESTIONS'
  | 'INVALID_QUESTION'
  | 'INVALID_OPTIONS'
  | 'INVALID_CORRECT_ANSWERS'
  | 'FILE_TOO_LARGE'
  | 'TOO_MANY_QUESTIONS'
  | 'DUPLICATE_SOURCE'
  | 'DUPLICATE_QUESTION_NUMBER'
  | 'DUPLICATE_QUESTION'
  | 'IMPORT_FAILED'

export type ImportIssue = {
  index: number | null
  field: string
  code: ImportErrorCode
  message: string
}

export class ImportError extends Error {
  readonly code: ImportErrorCode
  readonly issues: ImportIssue[]

  constructor(code: ImportErrorCode, summary: string, issues: ImportIssue[] = []) {
    super(issues.length > 0 ? `${summary}\n${formatImportIssues(issues)}` : summary)
    this.name = 'ImportError'
    this.code = code
    this.issues = issues
  }
}

export type ImportPayload = {
  text: string
  fileName: string
  title: string
}

export type NormalizedQuestion = {
  questionNumber: number | null
  topic: string | null
  question: string
  options: QuizOption[]
  correctAnswers: string[]
  explanation: string | null
  sortOrder: number
  contentHash: string
}

export type NormalizedImport = {
  title: string
  description: string | null
  topicLabels: Record<string, string>
  sourceFilename: string | null
  questions: NormalizedQuestion[]
  sourceHash: string
}

const optionEntrySchema = z.object({
  key: z.string(),
  text: z.string(),
})

const optionsSchema = z.union([
  z.record(z.string(), z.string()),
  z.array(optionEntrySchema),
])

const correctAnswersSchema = z.union([z.array(z.string()), z.string()])

const questionInputSchema = z.object({
  question: z.string(),
  options: optionsSchema,
  correct_answers: correctAnswersSchema,
  question_number: z.unknown().optional(),
  topic: z.unknown().optional(),
  explanation: z.unknown().optional(),
})

const optionCollator = new Intl.Collator('en', { numeric: true })

function issue(
  index: number | null,
  field: string,
  code: ImportErrorCode,
  message: string,
): ImportIssue {
  return { index, field, code, message }
}

function questionIssue(index: number, message: string): ImportIssue {
  return issue(index, 'question', 'INVALID_QUESTION', `第 ${index + 1} 題：${message}`)
}

function optionIssue(index: number, message: string): ImportIssue {
  return issue(index, 'options', 'INVALID_OPTIONS', `第 ${index + 1} 題：${message}`)
}

function answerIssue(index: number, message: string): ImportIssue {
  return issue(index, 'correct_answers', 'INVALID_CORRECT_ANSWERS', `第 ${index + 1} 題：${message}`)
}

function uniqueIssues(issues: ImportIssue[]): ImportIssue[] {
  const seen = new Set<string>()
  return issues.filter((item) => {
    const key = `${item.index}:${item.field}:${item.message}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function parseSource(text: string): RawImportSource {
  const result = extractImportSource(text)
  if (!result.ok) {
    throw result.code === 'INVALID_JSON'
      ? new ImportError('INVALID_JSON', '檔案不是有效的 JSON。')
      : new ImportError('INVALID_SHAPE', '格式不符合，請確認最外層結構。')
  }

  return result.source
}

function normalizeTitle(payload: ImportPayload, source: RawImportSource): string {
  const override = payload.title.trim()
  if (override) return override

  const sourceTitle = typeof source.title === 'string' ? source.title.trim() : ''
  if (sourceTitle) return sourceTitle

  const fileTitle = payload.fileName.replace(/\.(json|csv|tsv)$/i, '').trim()
  return fileTitle || '未命名題庫'
}

function normalizeDescription(source: RawImportSource): string | null {
  if (typeof source.description !== 'string') return null
  const description = source.description.trim()
  return description || null
}

function normalizeTopicLabels(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {}

  const labels: Record<string, string> = {}
  for (const [rawKey, rawValue] of Object.entries(value)) {
    if (typeof rawValue !== 'string' && typeof rawValue !== 'number') continue
    const key = rawKey.trim()
    if (!key) continue
    labels[key] = String(rawValue).trim()
  }

  return labels
}

type CanonicalOptions = {
  options: unknown
  derivedAnswers: string[]
}

function canonicalizeOptions(raw: unknown): CanonicalOptions {
  if (raw === undefined) {
    return { options: raw, derivedAnswers: [] }
  }

  if (Array.isArray(raw)) {
    if (raw.every((item) => typeof item === 'string')) {
      return {
        options: Object.fromEntries(
          raw.map((text, index) => [optionKey(index), text]),
        ),
        derivedAnswers: [],
      }
    }

    if (raw.every(isRecord)) {
      const options: QuizOption[] = []
      const derivedAnswers: string[] = []

      raw.forEach((item, index) => {
        const text = item.text ?? item.label ?? item.value
        const key = item.key ?? item.id ?? optionKey(index)
        if (typeof text !== 'string' && typeof text !== 'number') return

        options.push({ key: String(key), text: String(text) })
        if (item.correct === true) derivedAnswers.push(String(key))
      })

      if (options.length === raw.length) {
        return { options, derivedAnswers }
      }
    }

    return { options: raw, derivedAnswers: [] }
  }

  if (isRecord(raw)) {
    const options: Record<string, string> = {}
    const derivedAnswers: string[] = []

    for (const [key, value] of Object.entries(raw)) {
      if (typeof value === 'string' || typeof value === 'number') {
        options[key] = String(value)
        continue
      }

      if (isRecord(value)) {
        const text = value.text ?? value.label ?? value.value
        if (typeof text !== 'string' && typeof text !== 'number') {
          return { options: raw, derivedAnswers: [] }
        }

        options[key] = String(text)
        if (value.correct === true) derivedAnswers.push(key)
        continue
      }

      return { options: raw, derivedAnswers: [] }
    }

    return { options, derivedAnswers }
  }

  return { options: raw, derivedAnswers: [] }
}

type OptionLookup = {
  keys: string[]
  keyMap: Map<string, string>
  textMap: Map<string, string>
}

function optionLookup(options: unknown): OptionLookup | null {
  const entries: Array<{ key: unknown; text: unknown }> = []

  if (Array.isArray(options)) {
    for (const item of options) {
      if (!isRecord(item)) return null
      entries.push({ key: item.key, text: item.text })
    }
  } else if (isRecord(options)) {
    for (const [key, text] of Object.entries(options)) {
      entries.push({ key, text })
    }
  } else {
    return null
  }

  const lookup: OptionLookup = {
    keys: [],
    keyMap: new Map(),
    textMap: new Map(),
  }
  const textCounts = new Map<string, number>()

  for (const entry of entries) {
    if (typeof entry.key !== 'string' || typeof entry.text !== 'string') continue

    const key = entry.key.trim().toUpperCase()
    const text = entry.text.trim()
    lookup.keys.push(key)
    lookup.keyMap.set(key, key)
    lookup.textMap.set(text, key)
    textCounts.set(text, (textCounts.get(text) ?? 0) + 1)
  }

  for (const [text, count] of textCounts) {
    if (count > 1) lookup.textMap.delete(text)
  }

  return lookup
}

function resolveAnswerToken(
  value: string,
  lookup: OptionLookup,
): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  return (
    lookup.keyMap.get(trimmed.toUpperCase()) ??
    lookup.textMap.get(trimmed) ??
    null
  )
}

function resolveAnswerTokens(
  value: string | number,
  lookup: OptionLookup,
): string[] | null {
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) return null

    const byKey = lookup.keyMap.get(String(value))
    if (byKey) return [byKey]

    if (value >= 1 && value <= lookup.keys.length) {
      return [lookup.keys[value - 1]]
    }

    return null
  }

  const direct = resolveAnswerToken(value, lookup)
  if (direct) return [direct]

  const parts = value.split(/[,、;；\s]+/).filter(Boolean)
  if (parts.length > 1) {
    const resolved = parts.map((part) => resolveAnswerToken(part, lookup))
    if (resolved.every((part): part is string => part !== null)) {
      return resolved
    }
  }

  const characters = [...value.trim()]
  if (characters.length > 1) {
    const resolved = characters.map((character) =>
      resolveAnswerToken(character, lookup),
    )
    if (resolved.every((part): part is string => part !== null)) {
      return resolved
    }
  }

  return null
}

function resolveAnswers(raw: unknown, options: unknown): unknown {
  if (raw === undefined || raw === null) return raw

  if (isRecord(raw)) {
    const entries = Object.entries(raw)
    if (entries.every(([, value]) => typeof value === 'boolean')) {
      return entries.filter(([, value]) => value).map(([key]) => key)
    }

    return raw
  }

  const lookup = optionLookup(options)
  if (!lookup) return raw

  const list = Array.isArray(raw) ? raw : [raw]
  const resolved: unknown[] = []

  for (const item of list) {
    if (typeof item === 'string' || typeof item === 'number') {
      const keys = resolveAnswerTokens(item, lookup)
      if (keys) {
        resolved.push(...keys)
        continue
      }
    }

    resolved.push(item)
  }

  return resolved
}

function canonicalizeQuestion(raw: Record<string, unknown>): Record<string, unknown> {
  const canonicalOptions = canonicalizeOptions(
    pickField(raw, QUESTION_FIELD_ALIASES.options),
  )
  const rawAnswers = pickField(raw, QUESTION_FIELD_ALIASES.answers)
  const answers =
    rawAnswers !== undefined
      ? rawAnswers
      : canonicalOptions.derivedAnswers.length > 0
        ? canonicalOptions.derivedAnswers
        : undefined

  return {
    question: pickField(raw, QUESTION_FIELD_ALIASES.question),
    options: canonicalOptions.options,
    correct_answers: resolveAnswers(answers, canonicalOptions.options),
    question_number: pickField(raw, QUESTION_FIELD_ALIASES.questionNumber),
    topic: pickField(raw, QUESTION_FIELD_ALIASES.topic),
    explanation: pickField(raw, QUESTION_FIELD_ALIASES.explanation),
  }
}

function normalizeQuestionNumber(value: unknown, index: number): number | null {
  if (value === undefined || value === null) return index + 1
  if (typeof value === 'string' && value.trim() === '') return index + 1

  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value.trim())
        : Number.NaN

  if (!Number.isInteger(parsed) || parsed < 1) return null

  return parsed
}

function normalizeTopic(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim()
  }

  return null
}

function optionEntries(
  raw: z.infer<typeof optionsSchema>,
): Array<{ key: string; text: string }> {
  if (Array.isArray(raw)) {
    return raw.map((item) => ({ key: item.key, text: item.text }))
  }

  return Object.entries(raw).map(([key, text]) => ({ key, text }))
}

function zodQuestionIssues(
  index: number,
  parsed: z.ZodError<z.infer<typeof questionInputSchema>>,
): ImportIssue[] {
  return parsed.issues.map((item) => {
    const field = String(item.path[0] ?? 'question')

    if (field === 'options') {
      return optionIssue(index, '選項格式錯誤，必須是選項物件或 { key, text } 陣列。')
    }

    if (field === 'correct_answers') {
      return answerIssue(index, '正確答案格式錯誤，必須是字串陣列或單一字串。')
    }

    return questionIssue(index, '缺少題幹。')
  })
}

async function normalizeQuestion(
  raw: unknown,
  index: number,
): Promise<{ question: NormalizedQuestion | null; issues: ImportIssue[] }> {
  if (!isRecord(raw)) {
    return {
      question: null,
      issues: [questionIssue(index, '題目格式錯誤，必須是物件。')],
    }
  }

  const canonical = canonicalizeQuestion(raw)
  const parsed = questionInputSchema.safeParse(canonical)
  if (!parsed.success) {
    return { question: null, issues: uniqueIssues(zodQuestionIssues(index, parsed.error)) }
  }

  const issues: ImportIssue[] = []
  const questionNumber = normalizeQuestionNumber(
    parsed.data.question_number,
    index,
  )
  if (questionNumber === null) {
    issues.push(questionIssue(index, '題號必須是正整數。'))
  }

  const entries = optionEntries(parsed.data.options)

  if (entries.length < 2) {
    issues.push(optionIssue(index, '至少需要 2 個選項。'))
  }

  if (entries.length > IMPORT_LIMITS.optionCount) {
    issues.push(optionIssue(index, `選項不可超過 ${IMPORT_LIMITS.optionCount} 個。`))
  }

  const options: QuizOption[] = []
  const optionKeys = new Set<string>()

  for (const entry of entries) {
    const key = entry.key.trim().toUpperCase()

    if (!key) {
      issues.push(optionIssue(index, '選項鍵不可空白。'))
      continue
    }

    if (optionKeys.has(key)) {
      issues.push(optionIssue(index, `選項鍵 ${key} 重複。`))
      continue
    }

    optionKeys.add(key)
    options.push({ key, text: entry.text })
  }

  options.sort((left, right) => optionCollator.compare(left.key, right.key))

  const rawAnswers =
    typeof parsed.data.correct_answers === 'string'
      ? [parsed.data.correct_answers]
      : parsed.data.correct_answers

  const correctAnswers = [
    ...new Set(
      rawAnswers
        .map((answer) => answer.trim().toUpperCase())
        .filter((answer) => answer.length > 0),
    ),
  ].sort((left, right) => optionCollator.compare(left, right))

  if (correctAnswers.length === 0) {
    issues.push(answerIssue(index, '至少需要一個正確答案。'))
  }

  for (const answer of correctAnswers) {
    if (!optionKeys.has(answer)) {
      issues.push(answerIssue(index, `正確答案 ${answer} 不存在於選項。`))
    }
  }

  const question = parsed.data.question.trim()
  if (!question) {
    issues.push(questionIssue(index, '題幹不可空白。'))
  } else if (question.length > IMPORT_LIMITS.textLength) {
    issues.push(
      questionIssue(index, `題幹不可超過 ${IMPORT_LIMITS.textLength} 字元。`),
    )
  }

  let explanation: string | null = null
  if (typeof parsed.data.explanation === 'string') {
    const trimmed = parsed.data.explanation.trim()
    if (trimmed.length > IMPORT_LIMITS.textLength) {
      issues.push(
        questionIssue(index, `解析不可超過 ${IMPORT_LIMITS.textLength} 字元。`),
      )
    } else if (trimmed) {
      explanation = trimmed
    }
  } else if (parsed.data.explanation != null) {
    issues.push(questionIssue(index, '解析必須是文字。'))
  }

  if (issues.length > 0) {
    return { question: null, issues: uniqueIssues(issues) }
  }

  const contentHash = await sha256Hex(
    `${question}${JSON.stringify(options)}${JSON.stringify(correctAnswers)}`,
  )

  return {
    question: {
      questionNumber,
      topic: normalizeTopic(parsed.data.topic),
      question,
      options,
      correctAnswers,
      explanation,
      sortOrder: index,
      contentHash,
    },
    issues: [],
  }
}

export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export function formatImportIssues(issues: ImportIssue[]): string {
  return issues
    .slice(0, 20)
    .map((item) => item.message)
    .join('\n')
}

function dedupeQuestions(questions: NormalizedQuestion[]): {
  questions: NormalizedQuestion[]
  issues: ImportIssue[]
} {
  const byNumber = new Map<number, NormalizedQuestion>()
  const numberByHash = new Map<string, number>()
  const issues: ImportIssue[] = []
  const unique: NormalizedQuestion[] = []

  for (const question of questions) {
    const number = question.questionNumber ?? question.sortOrder + 1
    const existing = byNumber.get(number)

    if (existing) {
      if (existing.contentHash === question.contentHash) continue

      issues.push(
        issue(
          question.sortOrder,
          'question_number',
          'DUPLICATE_QUESTION_NUMBER',
          `題號 ${number} 重複，且內容不同。`,
        ),
      )
      continue
    }

    const duplicatedNumber = numberByHash.get(question.contentHash)
    if (duplicatedNumber !== undefined) {
      issues.push(
        issue(
          question.sortOrder,
          'question',
          'DUPLICATE_QUESTION',
          `題號 ${number} 與題號 ${duplicatedNumber} 的內容完全相同。`,
        ),
      )
      continue
    }

    byNumber.set(number, question)
    numberByHash.set(question.contentHash, number)
    unique.push(question)
  }

  return { questions: unique, issues }
}

export async function normalizeImport(payload: ImportPayload): Promise<NormalizedImport> {
  const byteLength = new TextEncoder().encode(payload.text).length
  if (byteLength > IMPORT_LIMITS.fileBytes) {
    throw new ImportError('FILE_TOO_LARGE', '檔案過大，請確認檔案小於 10MB。')
  }

  const source = parseSource(payload.text)
  const questions = source.questions

  if (questions.length === 0) {
    throw new ImportError('EMPTY_QUESTIONS', '題庫沒有任何題目。')
  }

  if (questions.length > IMPORT_LIMITS.questionCount) {
    throw new ImportError(
      'TOO_MANY_QUESTIONS',
      `題數超過上限，最多 ${IMPORT_LIMITS.questionCount} 題。`,
    )
  }

  const issues: ImportIssue[] = []
  const normalizedQuestions: NormalizedQuestion[] = []

  for (const [index, raw] of questions.entries()) {
    const result = await normalizeQuestion(raw, index)
    issues.push(...result.issues)
    if (result.question) normalizedQuestions.push(result.question)
  }

  if (issues.length > 0) {
    const firstCode = issues[0].code
    throw new ImportError(firstCode, '無法匯入題庫，請修正以下問題。', uniqueIssues(issues))
  }

  const deduped = dedupeQuestions(normalizedQuestions)
  if (deduped.issues.length > 0) {
    const firstCode = deduped.issues[0].code
    throw new ImportError(
      firstCode,
      '無法匯入題庫，請修正以下問題。',
      uniqueIssues(deduped.issues),
    )
  }

  const title = normalizeTitle(payload, source)
  const contentHashes = deduped.questions
    .map((question) => question.contentHash)
    .sort()
  const sourceHash = await sha256Hex(`${title}${JSON.stringify(contentHashes)}`)

  return {
    title,
    description: normalizeDescription(source),
    topicLabels: normalizeTopicLabels(source.topicLabels),
    sourceFilename: payload.fileName.trim() || null,
    questions: deduped.questions,
    sourceHash,
  }
}
