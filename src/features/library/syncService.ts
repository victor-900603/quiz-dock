import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '../../types/database'
import { describeSupabaseError } from '../../lib/errors'
import { supabase } from '../../lib/supabase'
import {
  normalizeImport,
  type ImportPayload,
  type NormalizedQuestion,
  type NormalizedImport,
} from '../../schemas/import'
import { IMPORT_BATCH_SIZE } from './importService'

type Client = SupabaseClient<Database>

const LOOKUP_PAGE_SIZE = 1000

export type QuestionIdentity = {
  id: string
  questionNumber: number
  contentHash: string
  sortOrder: number
  question: string
}

export type SyncChange = {
  questionNumber: number
  sortOrder: number
  question: string
}

export type RemovedQuestion = SyncChange & {
  id: string
  attemptCount: number
  markCount: number
}

export type QuestionDiff = {
  added: NormalizedQuestion[]
  updated: NormalizedQuestion[]
  reordered: NormalizedQuestion[]
  removed: QuestionIdentity[]
  unchangedCount: number
}

export type SyncPlan = {
  totalCount: number
  added: SyncChange[]
  updated: SyncChange[]
  reordered: SyncChange[]
  removed: RemovedQuestion[]
  unchangedCount: number
  updatedAttemptCount: number
  removedAttemptCount: number
  removedMarkCount: number
}

export type SyncResult = {
  plan: SyncPlan
  sessionSynced: boolean
}

type PreparedSync = {
  normalized: NormalizedImport
  diff: QuestionDiff
  plan: SyncPlan
}

function questionNumberOf(question: NormalizedQuestion): number {
  return question.questionNumber ?? question.sortOrder + 1
}

function toChange(question: NormalizedQuestion): SyncChange {
  return {
    questionNumber: questionNumberOf(question),
    sortOrder: question.sortOrder,
    question: question.question,
  }
}

export function diffQuestions(
  existing: QuestionIdentity[],
  incoming: NormalizedQuestion[],
): QuestionDiff {
  const existingByNumber = new Map(
    existing.map((question) => [question.questionNumber, question]),
  )
  const incomingNumbers = new Set(incoming.map(questionNumberOf))
  const added: NormalizedQuestion[] = []
  const updated: NormalizedQuestion[] = []
  const reordered: NormalizedQuestion[] = []
  let unchangedCount = 0

  for (const question of incoming) {
    const current = existingByNumber.get(questionNumberOf(question))

    if (!current) {
      added.push(question)
      continue
    }

    if (current.contentHash !== question.contentHash) {
      updated.push(question)
      continue
    }

    if (current.sortOrder !== question.sortOrder) {
      reordered.push(question)
      continue
    }

    unchangedCount += 1
  }

  return {
    added,
    updated,
    reordered,
    removed: existing.filter((question) => !incomingNumbers.has(question.questionNumber)),
    unchangedCount,
  }
}

export async function loadQuestionIdentities(
  setId: string,
  client: Client = supabase,
): Promise<QuestionIdentity[]> {
  const identities: QuestionIdentity[] = []
  let start = 0

  while (true) {
    const { data, error } = await client
      .from('questions')
      .select('id, question_number, content_hash, sort_order, question')
      .eq('set_id', setId)
      .order('id', { ascending: true })
      .range(start, start + LOOKUP_PAGE_SIZE - 1)

    if (error) {
      throw new Error(describeSupabaseError(error, '無法載入題目，請稍後再試。'))
    }

    const page = data ?? []
    for (const row of page) {
      identities.push({
        id: row.id,
        questionNumber: row.question_number,
        contentHash: row.content_hash,
        sortOrder: row.sort_order,
        question: row.question,
      })
    }

    if (page.length < LOOKUP_PAGE_SIZE) break
    start += LOOKUP_PAGE_SIZE
  }

  return identities
}

async function countSetAttempts(
  setId: string,
  client: Client,
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  let start = 0

  while (true) {
    const { data, error } = await client
      .from('attempts')
      .select('question_id')
      .eq('set_id', setId)
      .order('id', { ascending: true })
      .range(start, start + LOOKUP_PAGE_SIZE - 1)

    if (error) {
      throw new Error(describeSupabaseError(error, '無法載入作答紀錄，請稍後再試。'))
    }

    const page = data ?? []
    for (const row of page) {
      counts.set(row.question_id, (counts.get(row.question_id) ?? 0) + 1)
    }

    if (page.length < LOOKUP_PAGE_SIZE) break
    start += LOOKUP_PAGE_SIZE
  }

  return counts
}

async function countMarks(
  questionIds: string[],
  client: Client,
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()

  for (let index = 0; index < questionIds.length; index += IMPORT_BATCH_SIZE) {
    const chunk = questionIds.slice(index, index + IMPORT_BATCH_SIZE)
    const { data, error } = await client
      .from('question_marks')
      .select('question_id')
      .in('question_id', chunk)

    if (error) {
      throw new Error(describeSupabaseError(error, '無法載入題目標記，請稍後再試。'))
    }

    for (const row of data ?? []) {
      counts.set(row.question_id, (counts.get(row.question_id) ?? 0) + 1)
    }
  }

  return counts
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

async function prepareSync(
  setId: string,
  payload: ImportPayload,
  client: Client,
): Promise<PreparedSync> {
  const normalized = await normalizeImport(payload)
  const identities = await loadQuestionIdentities(setId, client)
  const diff = diffQuestions(identities, normalized.questions)
  const attemptCounts = await countSetAttempts(setId, client)
  const markCounts = await countMarks(
    diff.removed.map((question) => question.id),
    client,
  )

  const identityByNumber = new Map(
    identities.map((identity) => [identity.questionNumber, identity]),
  )
  const updatedAttemptCount = sum(
    diff.updated.map((question) => {
      const identity = identityByNumber.get(questionNumberOf(question))
      return identity ? (attemptCounts.get(identity.id) ?? 0) : 0
    }),
  )

  const removed: RemovedQuestion[] = diff.removed.map((question) => ({
    id: question.id,
    questionNumber: question.questionNumber,
    sortOrder: question.sortOrder,
    question: question.question,
    attemptCount: attemptCounts.get(question.id) ?? 0,
    markCount: markCounts.get(question.id) ?? 0,
  }))

  return {
    normalized,
    diff,
    plan: {
      totalCount: normalized.questions.length,
      added: diff.added.map(toChange),
      updated: diff.updated.map(toChange),
      reordered: diff.reordered.map(toChange),
      removed,
      unchangedCount: diff.unchangedCount,
      updatedAttemptCount,
      removedAttemptCount: sum(removed.map((question) => question.attemptCount)),
      removedMarkCount: sum(removed.map((question) => question.markCount)),
    },
  }
}

export async function previewQuizSetSync(
  setId: string,
  payload: ImportPayload,
  client: Client = supabase,
): Promise<SyncPlan> {
  const { plan } = await prepareSync(setId, payload, client)
  return plan
}

function toQuestionRow(
  setId: string,
  ownerId: string,
  question: NormalizedQuestion,
): Database['public']['Tables']['questions']['Insert'] {
  return {
    set_id: setId,
    owner_id: ownerId,
    question_number: questionNumberOf(question),
    topic: question.topic,
    question: question.question,
    options: question.options as unknown as Json,
    correct_answers: question.correctAnswers,
    explanation: question.explanation,
    content_hash: question.contentHash,
    sort_order: question.sortOrder,
  }
}

async function deleteRemovedQuestions(
  setId: string,
  removed: RemovedQuestion[],
  client: Client,
): Promise<void> {
  for (let index = 0; index < removed.length; index += IMPORT_BATCH_SIZE) {
    const numbers = removed
      .slice(index, index + IMPORT_BATCH_SIZE)
      .map((question) => question.questionNumber)

    const { error } = await client
      .from('questions')
      .delete()
      .eq('set_id', setId)
      .in('question_number', numbers)

    if (error) {
      throw new Error(describeSupabaseError(error, '無法移除舊題目，請稍後再試。'))
    }
  }
}

async function writeQuestions(
  setId: string,
  ownerId: string,
  questions: NormalizedQuestion[],
  client: Client,
): Promise<void> {
  for (let index = 0; index < questions.length; index += IMPORT_BATCH_SIZE) {
    const rows = questions
      .slice(index, index + IMPORT_BATCH_SIZE)
      .map((question) => toQuestionRow(setId, ownerId, question))

    const { error } = await client.from('questions').upsert(rows, {
      onConflict: 'set_id,question_number',
      ignoreDuplicates: false,
    })

    if (error) {
      throw new Error(describeSupabaseError(error, '無法寫入題目，請稍後再試。'))
    }
  }
}

export async function syncQuizSet(
  setId: string,
  payload: ImportPayload,
  options: { ownerId: string; client?: Client },
): Promise<SyncResult> {
  const client = options.client ?? supabase
  const { normalized, diff, plan } = await prepareSync(setId, payload, client)

  const { data: updatedSet, error: setError } = await client
    .from('quiz_sets')
    .update({
      description: normalized.description,
      topic_labels: normalized.topicLabels,
      source_filename: normalized.sourceFilename,
      source_hash: normalized.sourceHash,
    })
    .eq('id', setId)
    .select('id')
    .maybeSingle()

  if (setError) {
    throw new Error(describeSupabaseError(setError, '更新題庫失敗，請稍後再試。'))
  }

  if (!updatedSet) {
    throw new Error('找不到題庫，或沒有修改權限。')
  }

  await deleteRemovedQuestions(setId, plan.removed, client)
  await writeQuestions(
    setId,
    options.ownerId,
    [...diff.added, ...diff.updated, ...diff.reordered],
    client,
  )

  const { error: syncError } = await client.rpc('sync_practice_session', {
    p_set_id: setId,
  })

  if (syncError) {
    throw new Error(
      describeSupabaseError(
        syncError,
        '題目已更新，但練習進度重整失敗，請重試同一份檔案。',
      ),
    )
  }

  return { plan, sessionSynced: true }
}
