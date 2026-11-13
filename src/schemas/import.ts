import { z } from 'zod'
import type { QuizOption } from '../types/quiz'

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

const envelopeSchema = z.object({
  title: z.unknown().optional(),
  description: z.unknown().optional(),
  topic_labels: z.unknown().optional(),
  questions: z.array(z.unknown()),
})

const optionCollator = new Intl.Collator('en', { numeric: true })

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

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

function parseEnvelope(text: string): {
  questions: unknown[]
  wrapped: z.infer<typeof envelopeSchema> | null
} {
  let data: unknown

  try {
    data = JSON.parse(text)
  } catch {
    throw new ImportError('INVALID_JSON', '檔案不是有效的 JSON。')
  }

  if (Array.isArray(data)) {
    return { questions: data, wrapped: null }
  }

  const parsed = envelopeSchema.safeParse(data)
  if (!parsed.success) {
    throw new ImportError('INVALID_SHAPE', '格式不符合，請確認最外層結構。')
  }

  return { questions: parsed.data.questions, wrapped: parsed.data }
}

function normalizeTitle(payload: ImportPayload, wrapped: z.infer<typeof envelopeSchema> | null): string {
  const override = payload.title.trim()
  if (override) return override

  const wrappedTitle = typeof wrapped?.title === 'string' ? wrapped.title.trim() : ''
  if (wrappedTitle) return wrappedTitle

  const fileTitle = payload.fileName.replace(/\.json$/i, '').trim()
  return fileTitle || '未命名題庫'
}

function normalizeDescription(wrapped: z.infer<typeof envelopeSchema> | null): string | null {
  if (typeof wrapped?.description !== 'string') return null
  const description = wrapped.description.trim()
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

function normalizeQuestionNumber(value: unknown, index: number): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value)
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return Math.trunc(parsed)
  }

  return index + 1
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

  const parsed = questionInputSchema.safeParse(raw)
  if (!parsed.success) {
    return { question: null, issues: uniqueIssues(zodQuestionIssues(index, parsed.error)) }
  }

  const issues: ImportIssue[] = []
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
  if (typeof raw.explanation === 'string') {
    const trimmed = raw.explanation.trim()
    if (trimmed.length > IMPORT_LIMITS.textLength) {
      issues.push(
        questionIssue(index, `解析不可超過 ${IMPORT_LIMITS.textLength} 字元。`),
      )
    } else if (trimmed) {
      explanation = trimmed
    }
  } else if (raw.explanation != null) {
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
      questionNumber: normalizeQuestionNumber(parsed.data.question_number, index),
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

export async function normalizeImport(payload: ImportPayload): Promise<NormalizedImport> {
  const byteLength = new TextEncoder().encode(payload.text).length
  if (byteLength > IMPORT_LIMITS.fileBytes) {
    throw new ImportError('FILE_TOO_LARGE', '檔案過大，請確認檔案小於 10MB。')
  }

  const { questions, wrapped } = parseEnvelope(payload.text)

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

  const title = normalizeTitle(payload, wrapped)
  const contentHashes = normalizedQuestions
    .map((question) => question.contentHash)
    .sort()
  const sourceHash = await sha256Hex(`${title}${JSON.stringify(contentHashes)}`)

  return {
    title,
    description: normalizeDescription(wrapped),
    topicLabels: normalizeTopicLabels(wrapped?.topic_labels),
    sourceFilename: payload.fileName.trim() || null,
    questions: normalizedQuestions,
    sourceHash,
  }
}
