import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import type {
  PracticeAttempt,
  PracticeMode,
  PracticeProgress,
  PracticeSession,
  PracticeSessionDetail,
  PracticeStatus,
  SubmitAnswerResult,
} from '../../types/quiz'
import { describeSupabaseError } from '../../lib/errors'
import { supabase } from '../../lib/supabase'
import { fetchSetDetail } from '../library/libraryService'

type Client = SupabaseClient<Database>
type SessionRow = Database['public']['Tables']['practice_sessions']['Row']
type AttemptRow = Database['public']['Tables']['attempts']['Row']
type SubmitRow = Database['public']['Functions']['submit_answer']['Returns'][number]

export type SubmitAnswerInput = {
  sessionId: string
  questionId: string
  selected: string[]
  durationMs?: number
}

function toPracticeMode(value: string): PracticeMode {
  return value === 'random' ? 'random' : 'sequential'
}

function toPracticeStatus(value: string): PracticeStatus {
  if (value === 'completed') return 'completed'
  if (value === 'abandoned') return 'abandoned'
  return 'in_progress'
}

export function mapPracticeSession(row: SessionRow): PracticeSession {
  return {
    id: row.id,
    setId: row.set_id,
    mode: toPracticeMode(row.mode),
    status: toPracticeStatus(row.status),
    questionOrder: row.question_order,
    currentIndex: row.current_index,
    totalQuestions: row.total_questions,
    answeredCount: row.answered_count,
    correctCount: row.correct_count,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  }
}

export function mapPracticeProgress(row: SessionRow): PracticeProgress {
  return {
    id: row.id,
    setId: row.set_id,
    mode: toPracticeMode(row.mode),
    status: toPracticeStatus(row.status),
    answered: row.answered_count,
    correct: row.correct_count,
    total: row.total_questions,
    updatedAt: row.updated_at,
  }
}

export function mapPracticeAttempt(row: AttemptRow): PracticeAttempt {
  return {
    questionId: row.question_id,
    selected: row.selected,
    isCorrect: row.is_correct,
    durationMs: row.duration_ms,
    answeredAt: row.answered_at,
    updatedAt: row.updated_at,
  }
}

export function mapSubmitResult(row: SubmitRow): SubmitAnswerResult {
  return {
    isCorrect: row.is_correct,
    correctAnswers: row.correct_answers,
    explanation: row.explanation ?? '',
    alreadyAnswered: row.already_answered,
    wasUpdated: row.was_updated,
    sessionStatus: toPracticeStatus(row.session_status),
    currentIndex: row.current_index,
    answeredCount: row.answered_count,
    correctCount: row.correct_count,
  }
}

export async function fetchPracticeSessions(
  client: Client = supabase,
): Promise<PracticeProgress[]> {
  const { data, error } = await client
    .from('practice_sessions')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) {
    throw new Error(describeSupabaseError(error, '無法載入練習進度，請稍後再試。'))
  }

  return (data ?? []).map(mapPracticeProgress)
}

export async function fetchPracticeSession(
  sessionId: string,
  client: Client = supabase,
): Promise<PracticeSessionDetail | null> {
  const { data: sessionRow, error } = await client
    .from('practice_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle()

  if (error) {
    throw new Error(describeSupabaseError(error, '無法載入練習，請稍後再試。'))
  }

  if (!sessionRow) return null

  const setDetail = await fetchSetDetail(sessionRow.set_id, client)
  if (!setDetail) {
    throw new Error('找不到題庫，可能已被刪除。')
  }

  const questionById = new Map(setDetail.questions.map((question) => [question.id, question]))
  const questions = sessionRow.question_order.flatMap((questionId) => {
    const question = questionById.get(questionId)
    return question ? [question] : []
  })

  if (questions.length === 0) {
    throw new Error('這場練習沒有可用的題目。')
  }

  const { data: attemptRows, error: attemptError } = await client
    .from('attempts')
    .select('*')
    .eq('session_id', sessionId)

  if (attemptError) {
    throw new Error(describeSupabaseError(attemptError, '無法載入作答紀錄，請稍後再試。'))
  }

  return {
    session: mapPracticeSession(sessionRow),
    set: setDetail.set,
    questions,
    attempts: (attemptRows ?? []).map(mapPracticeAttempt),
  }
}

export async function startPracticeSession(
  setId: string,
  mode: PracticeMode,
  restart: boolean,
  client: Client = supabase,
): Promise<PracticeSession> {
  const { data, error } = await client.rpc('start_practice_session', {
    p_set_id: setId,
    p_mode: mode,
    p_restart: restart,
  })

  if (error) {
    throw new Error(describeSupabaseError(error, '無法開始練習，請稍後再試。'))
  }

  if (!data) {
    throw new Error('無法開始練習，請稍後再試。')
  }

  return mapPracticeSession(data)
}

export async function submitPracticeAnswer(
  { sessionId, questionId, selected, durationMs }: SubmitAnswerInput,
  client: Client = supabase,
): Promise<SubmitAnswerResult> {
  const { data, error } = await client.rpc('submit_answer', {
    p_session_id: sessionId,
    p_question_id: questionId,
    p_selected: selected,
    p_duration_ms: durationMs,
  })

  if (error) {
    throw new Error(describeSupabaseError(error, '無法送出答案，請稍後再試。'))
  }

  const row = data?.[0]
  if (!row) {
    throw new Error('無法送出答案，請稍後再試。')
  }

  return mapSubmitResult(row)
}
