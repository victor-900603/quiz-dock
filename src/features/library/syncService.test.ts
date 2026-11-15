import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '../../types/database'
import type { ImportPayload, NormalizedQuestion } from '../../schemas/import'
import { importQuizSet } from './importService'
import {
  diffQuestions,
  previewQuizSetSync,
  syncQuizSet,
  type QuestionIdentity,
} from './syncService'
import {
  TEST_OWNER_ID,
  createFakeSupabase,
  type FakeSupabase,
} from '../../test/fakeSupabase'

function client(fake: FakeSupabase): SupabaseClient<Database> {
  return fake as unknown as SupabaseClient<Database>
}

function payload(questions: unknown[], title = '測試題庫'): ImportPayload {
  return {
    text: JSON.stringify({ title, questions }),
    fileName: 'quiz.json',
    title,
  }
}

function question(
  number: number,
  overrides: Record<string, unknown> = {},
) {
  return {
    question_number: number,
    topic: '1',
    question: `題目 ${number}`,
    options: { A: '選項甲', B: '選項乙' },
    correct_answers: ['B'],
    explanation: `解析 ${number}`,
    ...overrides,
  }
}

function identity(
  questionNumber: number,
  contentHash: string,
  sortOrder = questionNumber - 1,
): QuestionIdentity {
  return {
    id: `question-${questionNumber}`,
    questionNumber,
    contentHash,
    sortOrder,
    question: `題目 ${questionNumber}`,
  }
}

function incoming(
  questionNumber: number,
  contentHash: string,
  sortOrder = questionNumber - 1,
): NormalizedQuestion {
  return {
    questionNumber,
    topic: '1',
    question: `題目 ${questionNumber}`,
    options: [{ key: 'A', text: '選項甲' }],
    correctAnswers: ['A'],
    explanation: '',
    sortOrder,
    contentHash,
  }
}

async function createSet(
  fake: FakeSupabase,
  questions: unknown[],
): Promise<string> {
  const result = await importQuizSet(payload(questions), {
    ownerId: TEST_OWNER_ID,
    client: client(fake),
  })
  return result.id
}

type SeedPracticeOptions = {
  setId: string
  answeredNumbers: number[]
  selected?: string[]
  marks?: number[]
}

function seedPractice(fake: FakeSupabase, options: SeedPracticeOptions) {
  const questions = fake.tables.questions
    .filter((row) => row.set_id === options.setId)
    .sort((left, right) => Number(left.sort_order) - Number(right.sort_order))
  const byNumber = new Map(
    questions.map((row) => [Number(row.question_number), row]),
  )
  const now = '2026-11-15T00:00:00.000Z'

  fake.tables.practice_sessions.push({
    id: 'session-1',
    user_id: TEST_OWNER_ID,
    set_id: options.setId,
    mode: 'sequential',
    status: 'in_progress',
    question_order: questions.map((row) => row.id),
    current_index: 0,
    total_questions: questions.length,
    answered_count: options.answeredNumbers.length,
    correct_count: 0,
    started_at: now,
    updated_at: now,
    completed_at: null,
  })

  for (const number of options.answeredNumbers) {
    const question = byNumber.get(number)
    if (!question) continue

    fake.tables.attempts.push({
      id: `attempt-${number}`,
      user_id: TEST_OWNER_ID,
      session_id: 'session-1',
      set_id: options.setId,
      question_id: question.id,
      selected: options.selected ?? ['A'],
      is_correct: true,
      duration_ms: 1000,
      answered_at: now,
      updated_at: now,
    })
  }

  for (const number of options.marks ?? []) {
    const question = byNumber.get(number)
    if (!question) continue

    fake.tables.question_marks.push({
      user_id: TEST_OWNER_ID,
      question_id: question.id,
      created_at: now,
    })
  }
}

describe('diffQuestions', () => {
  it('classifies added, updated, reordered, removed, and unchanged questions', () => {
    const existing = [
      identity(1, 'hash-1'),
      identity(2, 'hash-2'),
      identity(3, 'hash-3'),
    ]
    const incomingQuestions = [
      incoming(1, 'hash-1'),
      incoming(2, 'hash-2-new'),
      incoming(4, 'hash-4'),
    ]
    const diff = diffQuestions(existing, incomingQuestions)

    expect(diff.added.map((item) => item.questionNumber)).toEqual([4])
    expect(diff.updated.map((item) => item.questionNumber)).toEqual([2])
    expect(diff.reordered).toHaveLength(0)
    expect(diff.removed.map((item) => item.questionNumber)).toEqual([3])
    expect(diff.unchangedCount).toBe(1)
  })

  it('treats a sort order change as a reorder', () => {
    const diff = diffQuestions(
      [identity(1, 'hash-1', 0)],
      [incoming(1, 'hash-1', 3)],
    )

    expect(diff.reordered.map((item) => item.questionNumber)).toEqual([1])
    expect(diff.updated).toHaveLength(0)
  })
})

describe('previewQuizSetSync', () => {
  it('reports the change counts and the data that will be lost', async () => {
    const fake = createFakeSupabase()
    const setId = await createSet(fake, [question(1), question(2), question(3)])
    seedPractice(fake, {
      setId,
      answeredNumbers: [1, 2],
      marks: [2],
    })

    const plan = await previewQuizSetSync(
      setId,
      payload([
        question(1, { correct_answers: ['A'] }),
        question(2),
        question(4),
      ]),
      client(fake),
    )

    expect(plan.totalCount).toBe(3)
    expect(plan.added.map((item) => item.questionNumber)).toEqual([4])
    expect(plan.updated.map((item) => item.questionNumber)).toEqual([1])
    expect(plan.removed.map((item) => item.questionNumber)).toEqual([3])
    expect(plan.unchangedCount).toBe(1)
    expect(plan.updatedAttemptCount).toBe(1)
    expect(plan.removedAttemptCount).toBe(0)
    expect(plan.removedMarkCount).toBe(0)
  })

  it('counts the attempts and marks of removed questions', async () => {
    const fake = createFakeSupabase()
    const setId = await createSet(fake, [question(1), question(2)])
    seedPractice(fake, { setId, answeredNumbers: [1, 2], marks: [2] })

    const plan = await previewQuizSetSync(setId, payload([question(1)]), client(fake))

    expect(plan.removed).toHaveLength(1)
    expect(plan.removed[0]).toMatchObject({
      questionNumber: 2,
      attemptCount: 1,
      markCount: 1,
    })
    expect(plan.removedAttemptCount).toBe(1)
    expect(plan.removedMarkCount).toBe(1)
  })
})

describe('syncQuizSet', () => {
  it('keeps progress, appends new questions, and recalculates correctness', async () => {
    const fake = createFakeSupabase()
    const setId = await createSet(fake, [question(1), question(2), question(3)])
    seedPractice(fake, { setId, answeredNumbers: [1, 2] })

    const result = await syncQuizSet(
      setId,
      payload([
        question(1, { correct_answers: ['A'] }),
        question(2),
        question(4),
      ]),
      { ownerId: TEST_OWNER_ID, client: client(fake) },
    )

    expect(result.sessionSynced).toBe(true)

    const questions = fake.tables.questions.filter((row) => row.set_id === setId)
    expect(questions.map((row) => row.question_number).sort()).toEqual([1, 2, 4])
    expect(questions.find((row) => row.question_number === 3)).toBeUndefined()

    const session = fake.tables.practice_sessions[0]
    expect(session.total_questions).toBe(3)
    expect(session.answered_count).toBe(2)
    expect(session.correct_count).toBe(1)
    expect(session.current_index).toBe(2)
    expect(session.status).toBe('in_progress')

    const questionOne = questions.find((row) => row.question_number === 1)
    const questionFour = questions.find((row) => row.question_number === 4)
    expect((session.question_order as string[])[2]).toBe(questionFour?.id)

    const attempt = fake.tables.attempts.find(
      (row) => row.question_id === questionOne?.id,
    )
    expect(attempt?.is_correct).toBe(true)

    const set = fake.tables.quiz_sets[0]
    expect(set.title).toBe('測試題庫')
    expect(set.source_hash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('deletes removed questions together with their attempts and marks', async () => {
    const fake = createFakeSupabase()
    const setId = await createSet(fake, [question(1), question(2)])
    seedPractice(fake, { setId, answeredNumbers: [1, 2], marks: [2] })

    await syncQuizSet(setId, payload([question(1)]), {
      ownerId: TEST_OWNER_ID,
      client: client(fake),
    })

    const remaining = fake.tables.questions.filter((row) => row.set_id === setId)
    expect(remaining).toHaveLength(1)
    expect(fake.tables.attempts).toHaveLength(1)
    expect(fake.tables.question_marks).toHaveLength(0)

    const session = fake.tables.practice_sessions[0]
    expect(session.question_order).toEqual([remaining[0].id])
    expect(session.answered_count).toBe(1)
    expect(session.correct_count).toBe(0)
    expect(session.status).toBe('completed')
    expect(session.current_index).toBe(1)
  })

  it('writes nothing when the file matches the current questions', async () => {
    const fake = createFakeSupabase()
    const setId = await createSet(fake, [question(1), question(2)])
    const writesBefore = fake.insertCounts.questions

    const result = await syncQuizSet(
      setId,
      payload([question(1), question(2)]),
      { ownerId: TEST_OWNER_ID, client: client(fake) },
    )

    expect(result.plan.added).toHaveLength(0)
    expect(result.plan.updated).toHaveLength(0)
    expect(result.plan.reordered).toHaveLength(0)
    expect(result.plan.removed).toHaveLength(0)
    expect(result.plan.unchangedCount).toBe(2)
    expect(fake.insertCounts.questions).toBe(writesBefore)
  })

  it('reports a failed practice state rebuild', async () => {
    const fake = createFakeSupabase()
    const setId = await createSet(fake, [question(1)])
    fake.failNextRpc('sync_practice_session', { message: 'rpc failed' })

    await expect(
      syncQuizSet(setId, payload([question(1), question(2)]), {
        ownerId: TEST_OWNER_ID,
        client: client(fake),
      }),
    ).rejects.toThrow('練習進度重整失敗')
  })

  it('reports a missing set', async () => {
    const fake = createFakeSupabase()

    await expect(
      syncQuizSet('missing', payload([question(1)]), {
        ownerId: TEST_OWNER_ID,
        client: client(fake),
      }),
    ).rejects.toThrow('找不到題庫，或沒有修改權限。')
  })
})
