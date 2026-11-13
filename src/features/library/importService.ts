import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import type { ImportPayload } from '../../schemas/import'
import { ImportError, normalizeImport } from '../../schemas/import'
import { describeSupabaseError } from '../../lib/errors'
import { supabase } from '../../lib/supabase'

type Client = SupabaseClient<Database>
type QuestionInsert = Database['public']['Tables']['questions']['Insert']

export const IMPORT_BATCH_SIZE = 200

export type ImportResult = {
  id: string
  title: string
}

type ImportOptions = {
  ownerId: string
  client?: Client
}

function uniqueQuestions(
  questions: Awaited<ReturnType<typeof normalizeImport>>['questions'],
) {
  const seen = new Set<string>()
  return questions.filter((question) => {
    if (seen.has(question.contentHash)) return false
    seen.add(question.contentHash)
    return true
  })
}

export async function importQuizSet(
  payload: ImportPayload,
  { ownerId, client = supabase }: ImportOptions,
): Promise<ImportResult> {
  const normalized = await normalizeImport(payload)

  const { data: existing, error: duplicateError } = await client
    .from('quiz_sets')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('source_hash', normalized.sourceHash)
    .limit(1)

  if (duplicateError) {
    throw new ImportError(
      'IMPORT_FAILED',
      describeSupabaseError(duplicateError, '無法檢查是否重複匯入，請稍後再試。'),
    )
  }

  if (existing && existing.length > 0) {
    throw new ImportError('DUPLICATE_SOURCE', '已匯入過相同題庫。')
  }

  const { data: created, error: setError } = await client
    .from('quiz_sets')
    .insert({
      owner_id: ownerId,
      title: normalized.title,
      description: normalized.description,
      topic_labels: normalized.topicLabels,
      source_filename: normalized.sourceFilename,
      source_hash: normalized.sourceHash,
    })
    .select('id, title')
    .single()

  if (setError || !created) {
    throw new ImportError(
      'IMPORT_FAILED',
      describeSupabaseError(setError, '匯入失敗，請稍後再試。'),
    )
  }

  const questions = uniqueQuestions(normalized.questions)

  try {
    for (let start = 0; start < questions.length; start += IMPORT_BATCH_SIZE) {
      const batch = questions.slice(start, start + IMPORT_BATCH_SIZE)
      const rows: QuestionInsert[] = batch.map((question) => ({
        set_id: created.id,
        owner_id: ownerId,
        question_number: question.questionNumber,
        topic: question.topic,
        question: question.question,
        options: question.options,
        correct_answers: question.correctAnswers,
        explanation: question.explanation,
        content_hash: question.contentHash,
        sort_order: question.sortOrder,
      }))

      const { error: questionError } = await client
        .from('questions')
        .upsert(rows, { onConflict: 'set_id,content_hash', ignoreDuplicates: true })

      if (questionError) {
        throw questionError
      }
    }
  } catch (error) {
    const { error: cleanupError } = await client
      .from('quiz_sets')
      .delete()
      .eq('id', created.id)

    const cleanupSuffix = cleanupError
      ? ' 但清除本次資料失敗，請聯絡管理員。'
      : ''

    throw new ImportError(
      'IMPORT_FAILED',
      `${describeSupabaseError(error, '匯入失敗，已清除本次資料。')}${cleanupSuffix}`,
    )
  }

  return { id: created.id, title: created.title }
}
