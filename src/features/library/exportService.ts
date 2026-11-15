import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import { supabase } from '../../lib/supabase'
import {
  fetchQuestionRows,
  fetchSetRow,
  parseOptions,
  parseTopicLabels,
} from './libraryService'

type Client = SupabaseClient<Database>
type SetRow = Database['public']['Tables']['quiz_sets']['Row']
type QuestionRow = Database['public']['Tables']['questions']['Row']

export type ExportQuestion = {
  question_number: number
  topic: string | null
  question: string
  options: Array<{ key: string; text: string }>
  correct_answers: string[]
  explanation: string | null
}

export type ExportDocument = {
  title: string
  description?: string
  topic_labels?: Record<string, string>
  questions: ExportQuestion[]
}

export type ExportResult = {
  fileName: string
  text: string
  document: ExportDocument
}

const answerCollator = new Intl.Collator('zh-TW', { numeric: true })

export function buildExportDocument(
  set: SetRow,
  questions: QuestionRow[],
): ExportDocument {
  const labels = parseTopicLabels(set.topic_labels)
  const document: ExportDocument = {
    title: set.title,
    questions: questions.map((question) => ({
      question_number: question.question_number,
      topic: question.topic,
      question: question.question,
      options: parseOptions(question.options),
      correct_answers: [...question.correct_answers].sort((left, right) =>
        answerCollator.compare(left, right),
      ),
      explanation: question.explanation,
    })),
  }

  if (set.description) document.description = set.description
  if (Object.keys(labels).length > 0) document.topic_labels = labels

  return document
}

export function exportFileName(title: string): string {
  const base = title.trim().replace(/[\\/:*?"<>|]/g, '_') || 'quiz'
  return `${base}.json`
}

export async function exportQuizSet(
  setId: string,
  client: Client = supabase,
): Promise<ExportResult> {
  const set = await fetchSetRow(setId, client)
  if (!set) {
    throw new Error('找不到題庫，或沒有匯出權限。')
  }

  const questions = await fetchQuestionRows(setId, client)
  const document = buildExportDocument(set, questions)

  return {
    fileName: exportFileName(set.title),
    text: `${JSON.stringify(document, null, 2)}\n`,
    document,
  }
}
