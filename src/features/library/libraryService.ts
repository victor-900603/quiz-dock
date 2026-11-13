import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '../../types/database'
import type { Question, QuizOption, QuizSet, TopicStat } from '../../types/quiz'
import { describeSupabaseError } from '../../lib/errors'
import { supabase } from '../../lib/supabase'

type Client = SupabaseClient<Database>
type SetRow = Database['public']['Tables']['quiz_sets']['Row']
type QuestionRow = Database['public']['Tables']['questions']['Row']

export type SetDetail = {
  set: QuizSet
  questions: Question[]
}

const topicCollator = new Intl.Collator('zh-TW', { numeric: true })

export const QUESTION_PAGE_SIZE = 1000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseTopicLabels(value: Json): Record<string, string> {
  if (!isRecord(value)) return {}

  const labels: Record<string, string> = {}
  for (const [key, rawValue] of Object.entries(value)) {
    if (typeof rawValue === 'string') labels[key] = rawValue
  }

  return labels
}

export function topicLabel(topic: string | null, labels: Record<string, string>): string {
  if (!topic) return '未分類'
  return labels[topic] ?? `主題 ${topic}`
}

export function parseOptions(value: Json): QuizOption[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((item) => {
    if (!isRecord(item)) return []
    const key = typeof item.key === 'string' ? item.key : ''
    const text = typeof item.text === 'string' ? item.text : ''
    return key ? [{ key, text }] : []
  })
}

function buildTopics(
  questions: Array<{ topic: string | null }>,
  labels: Record<string, string>,
): TopicStat[] {
  const counts = new Map<string, number>()

  for (const item of questions) {
    const name = topicLabel(item.topic, labels)
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }

  return [...counts.entries()]
    .sort(([left], [right]) => topicCollator.compare(left, right))
    .map(([name, total]) => ({ name, total, answered: 0, correct: 0 }))
}

export function mapSet(
  row: SetRow,
  questions: Array<{ topic: string | null }>,
): QuizSet {
  const labels = parseTopicLabels(row.topic_labels)
  const topics = buildTopics(questions, labels)

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    questionCount: questions.length,
    topicCount: topics.length,
    accuracy: null,
    answeredCount: 0,
    lastPracticedLabel: null,
    markedCount: 0,
    topics,
  }
}

export function mapQuestion(
  row: QuestionRow,
  labels: Record<string, string> = {},
): Question {
  return {
    id: row.id,
    number: row.question_number ?? row.sort_order + 1,
    topic: topicLabel(row.topic, labels),
    prompt: row.question,
    options: parseOptions(row.options),
    correctAnswers: row.correct_answers,
    explanation: row.explanation ?? '',
  }
}

export async function fetchSets(client: Client = supabase): Promise<QuizSet[]> {
  const { data: setRows, error } = await client
    .from('quiz_sets')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(describeSupabaseError(error, '無法載入題庫，請稍後再試。'))
  }

  if (!setRows || setRows.length === 0) return []

  const questionsBySet = new Map<string, Array<{ topic: string | null }>>()
  let start = 0

  while (true) {
    const { data: questionRows, error: questionError } = await client
      .from('questions')
      .select('set_id, topic')
      .order('id', { ascending: true })
      .range(start, start + QUESTION_PAGE_SIZE - 1)

    if (questionError) {
      throw new Error(describeSupabaseError(questionError, '無法載入題目，請稍後再試。'))
    }

    const page = questionRows ?? []
    for (const question of page) {
      const list = questionsBySet.get(question.set_id) ?? []
      list.push({ topic: question.topic })
      questionsBySet.set(question.set_id, list)
    }

    if (page.length < QUESTION_PAGE_SIZE) break
    start += QUESTION_PAGE_SIZE
  }

  return setRows.map((row) => mapSet(row, questionsBySet.get(row.id) ?? []))
}

export async function fetchSetDetail(
  setId: string,
  client: Client = supabase,
): Promise<SetDetail | null> {
  const { data: setRow, error } = await client
    .from('quiz_sets')
    .select('*')
    .eq('id', setId)
    .maybeSingle()

  if (error) {
    throw new Error(describeSupabaseError(error, '無法載入題庫，請稍後再試。'))
  }

  if (!setRow) return null

  const questions: QuestionRow[] = []
  let start = 0

  while (true) {
    const { data: questionRows, error: questionError } = await client
      .from('questions')
      .select('*')
      .eq('set_id', setId)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true })
      .range(start, start + QUESTION_PAGE_SIZE - 1)

    if (questionError) {
      throw new Error(describeSupabaseError(questionError, '無法載入題目，請稍後再試。'))
    }

    const page = questionRows ?? []
    questions.push(...page)

    if (page.length < QUESTION_PAGE_SIZE) break
    start += QUESTION_PAGE_SIZE
  }

  const labels = parseTopicLabels(setRow.topic_labels)
  return {
    set: mapSet(setRow, questions),
    questions: questions.map((question) => mapQuestion(question, labels)),
  }
}

export async function renameQuizSet(
  setId: string,
  title: string,
  client: Client = supabase,
): Promise<string> {
  const nextTitle = title.trim()
  if (!nextTitle) {
    throw new Error('題庫標題不可空白。')
  }

  const { data, error } = await client
    .from('quiz_sets')
    .update({ title: nextTitle })
    .eq('id', setId)
    .select('id')
    .maybeSingle()

  if (error) {
    throw new Error(describeSupabaseError(error, '重新命名失敗，請稍後再試。'))
  }

  if (!data) {
    throw new Error('找不到題庫，或沒有修改權限。')
  }

  return nextTitle
}

export async function deleteQuizSet(
  setId: string,
  client: Client = supabase,
): Promise<string> {
  const { data, error } = await client
    .from('quiz_sets')
    .delete()
    .eq('id', setId)
    .select('id')
    .maybeSingle()

  if (error) {
    throw new Error(describeSupabaseError(error, '刪除題庫失敗，請稍後再試。'))
  }

  if (!data) {
    throw new Error('找不到題庫，或沒有刪除權限。')
  }

  return data.id
}
