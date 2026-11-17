export const QUESTION_FIELD_ALIASES = {
  question: ['question', 'stem', 'prompt', 'content', 'text'],
  options: ['options', 'choices'],
  answers: [
    'correct_answers',
    'correctAnswers',
    'correct_answer',
    'answer',
    'correct',
  ],
  explanation: ['explanation', 'rationale', 'analysis'],
  questionNumber: ['question_number', 'questionNumber', 'number', 'no'],
  topic: ['topic', 'subject', 'category'],
} as const

export const ENVELOPE_TITLE_ALIASES = ['title', 'name'] as const
export const ENVELOPE_DESCRIPTION_ALIASES = ['description', 'desc'] as const
export const ENVELOPE_TOPIC_LABEL_ALIASES = [
  'topic_labels',
  'topicLabels',
  'topics',
] as const

const LIST_KEYS = ['questions', 'data', 'items', 'list'] as const
const NESTED_KEYS = ['quiz', 'result', 'data', 'items', 'list'] as const

export type RawImportSource = {
  questions: unknown[]
  title: unknown
  description: unknown
  topicLabels: unknown
}

export type ExtractImportSourceResult =
  | { ok: true; source: RawImportSource }
  | { ok: false; code: 'INVALID_JSON' | 'INVALID_SHAPE' }

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function pickField(
  record: Record<string, unknown>,
  aliases: readonly string[],
): unknown {
  for (const alias of aliases) {
    const value = record[alias]
    if (value === undefined || value === null) continue
    return value
  }

  return undefined
}

function findQuestions(
  record: Record<string, unknown>,
): { questions: unknown[]; container: Record<string, unknown> | null } | null {
  for (const key of LIST_KEYS) {
    const value = record[key]
    if (Array.isArray(value)) {
      return { questions: value, container: null }
    }
  }

  for (const key of NESTED_KEYS) {
    const value = record[key]
    if (!isRecord(value)) continue

    for (const listKey of LIST_KEYS) {
      if (Array.isArray(value[listKey])) {
        return { questions: value[listKey] as unknown[], container: value }
      }
    }
  }

  return null
}

export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

export function optionKey(index: number): string {
  let key = ''
  let current = index

  do {
    key = String.fromCharCode(65 + (current % 26)) + key
    current = Math.floor(current / 26) - 1
  } while (current >= 0)

  return key
}

export function extractImportSource(text: string): ExtractImportSourceResult {
  let data: unknown

  try {
    data = JSON.parse(stripBom(text))
  } catch {
    return { ok: false, code: 'INVALID_JSON' }
  }

  if (Array.isArray(data)) {
    return {
      ok: true,
      source: {
        questions: data,
        title: undefined,
        description: undefined,
        topicLabels: undefined,
      },
    }
  }

  if (!isRecord(data)) {
    return { ok: false, code: 'INVALID_SHAPE' }
  }

  const found = findQuestions(data)
  if (!found) {
    return { ok: false, code: 'INVALID_SHAPE' }
  }

  const metadata = found.container ?? data

  return {
    ok: true,
    source: {
      questions: found.questions,
      title:
        pickField(metadata, ENVELOPE_TITLE_ALIASES) ??
        pickField(data, ENVELOPE_TITLE_ALIASES),
      description:
        pickField(metadata, ENVELOPE_DESCRIPTION_ALIASES) ??
        pickField(data, ENVELOPE_DESCRIPTION_ALIASES),
      topicLabels:
        pickField(metadata, ENVELOPE_TOPIC_LABEL_ALIASES) ??
        pickField(data, ENVELOPE_TOPIC_LABEL_ALIASES),
    },
  }
}
