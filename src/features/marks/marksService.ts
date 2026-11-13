import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import type { MarkedQuestion } from '../../types/quiz'
import { describeSupabaseError } from '../../lib/errors'
import { supabase } from '../../lib/supabase'
import { mapQuestion, parseTopicLabels } from '../library/libraryService'

type Client = SupabaseClient<Database>
type QuestionRow = Database['public']['Tables']['questions']['Row']
type SetRow = Database['public']['Tables']['quiz_sets']['Row']

export async function fetchMarks(client: Client = supabase): Promise<MarkedQuestion[]> {
  const { data: markRows, error } = await client
    .from('question_marks')
    .select('question_id, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(describeSupabaseError(error, '無法載入標記，請稍後再試。'))
  }

  if (!markRows || markRows.length === 0) return []

  const questionIds = [...new Set(markRows.map((row) => row.question_id))]
  const { data: questionRows, error: questionError } = await client
    .from('questions')
    .select('*')
    .in('id', questionIds)

  if (questionError) {
    throw new Error(
      describeSupabaseError(questionError, '無法載入標記題目，請稍後再試。'),
    )
  }

  if (!questionRows || questionRows.length === 0) return []

  const setIds = [...new Set(questionRows.map((row) => row.set_id))]
  const { data: setRows, error: setError } = await client
    .from('quiz_sets')
    .select('*')
    .in('id', setIds)

  if (setError) {
    throw new Error(describeSupabaseError(setError, '無法載入標記題庫，請稍後再試。'))
  }

  const questionById = new Map<string, QuestionRow>(
    questionRows.map((row) => [row.id, row]),
  )
  const setById = new Map<string, SetRow>((setRows ?? []).map((row) => [row.id, row]))
  const labelsBySet = new Map(
    (setRows ?? []).map((row) => [row.id, parseTopicLabels(row.topic_labels)]),
  )

  return markRows.flatMap((mark) => {
    const question = questionById.get(mark.question_id)
    if (!question) return []

    const set = setById.get(question.set_id)
    if (!set) return []

    return [
      {
        ...mapQuestion(question, labelsBySet.get(set.id) ?? {}),
        setId: set.id,
        setTitle: set.title,
        markedAt: mark.created_at,
      },
    ]
  })
}

export async function addMark(
  questionId: string,
  userId: string,
  client: Client = supabase,
): Promise<void> {
  const { error } = await client
    .from('question_marks')
    .insert({ question_id: questionId, user_id: userId })

  if (error) {
    throw new Error(describeSupabaseError(error, '標記失敗，請再試一次。'))
  }
}

export async function removeMark(
  questionId: string,
  userId: string,
  client: Client = supabase,
): Promise<void> {
  const { error } = await client
    .from('question_marks')
    .delete()
    .eq('user_id', userId)
    .eq('question_id', questionId)

  if (error) {
    throw new Error(describeSupabaseError(error, '取消標記失敗，請再試一次。'))
  }
}
