import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '../../types/database'
import {
  createFakeSupabase,
  createSeedTables,
  type FakeSupabase,
} from '../../test/fakeSupabase'
import {
  deletePracticeSession,
  deletePracticeSessionsForSet,
  fetchPracticeSession,
  fetchPracticeSessions,
  finishPracticeSession,
  startPracticeSession,
  submitPracticeAnswer,
} from './practiceService'

function asClient(fake: FakeSupabase): SupabaseClient<Database> {
  return fake as unknown as SupabaseClient<Database>
}

describe('fetchPracticeSessions', () => {
  it('maps the current user sessions to progress', async () => {
    const fake = createFakeSupabase(createSeedTables())
    const progress = await fetchPracticeSessions(asClient(fake))

    expect(progress).toHaveLength(1)
    expect(progress[0]).toMatchObject({
      id: 'session-biology',
      setId: 'biology',
      mode: 'sequential',
      status: 'in_progress',
      answered: 2,
      correct: 2,
      total: 20,
    })
  })

  it('reports a network error', async () => {
    const fake = createFakeSupabase(createSeedTables())
    fake.failNextSelect('practice_sessions', { message: 'Failed to fetch' })

    await expect(fetchPracticeSessions(asClient(fake))).rejects.toThrow(
      '無法連線到伺服器，請檢查網路後再試一次。',
    )
  })
})

describe('fetchPracticeSession', () => {
  it('loads the session, ordered questions, and attempts', async () => {
    const fake = createFakeSupabase(createSeedTables())
    const detail = await fetchPracticeSession('session-biology', asClient(fake))

    expect(detail?.session.id).toBe('session-biology')
    expect(detail?.set.title).toBe('生物學基礎')
    expect(detail?.questions).toHaveLength(20)
    expect(detail?.questions[0].id).toBe('bio-1')
    expect(detail?.attempts.map((attempt) => attempt.questionId)).toEqual([
      'bio-1',
      'bio-2',
    ])
  })

  it('returns null for a missing session', async () => {
    const fake = createFakeSupabase(createSeedTables())

    await expect(
      fetchPracticeSession('missing-session', asClient(fake)),
    ).resolves.toBeNull()
  })

  it('reports a load error and a missing set', async () => {
    const fake = createFakeSupabase(createSeedTables())
    fake.failNextSelect('practice_sessions', { message: 'boom' })

    await expect(fetchPracticeSession('session-biology', asClient(fake))).rejects.toThrow(
      '無法載入練習，請稍後再試。',
    )

    const seed = createSeedTables()
    seed.practice_sessions = [
      {
        id: 'session-missing-set',
        user_id: 'test-user',
        set_id: 'missing-set',
        mode: 'sequential',
        status: 'in_progress',
        question_order: ['missing-question'],
        current_index: 0,
        total_questions: 1,
        answered_count: 0,
        correct_count: 0,
        started_at: '2026-11-13T00:00:00.000Z',
        updated_at: '2026-11-13T00:00:00.000Z',
        completed_at: null,
      },
    ]
    const missingSet = createFakeSupabase(seed)

    await expect(
      fetchPracticeSession('session-missing-set', asClient(missingSet)),
    ).rejects.toThrow('找不到題庫，可能已被刪除。')
  })

  it('reports an attempt load error and a session without usable questions', async () => {
    const fake = createFakeSupabase(createSeedTables())
    fake.failNextSelect('attempts', { message: 'boom' })

    await expect(fetchPracticeSession('session-biology', asClient(fake))).rejects.toThrow(
      '無法載入作答紀錄，請稍後再試。',
    )

    const seed = createSeedTables()
    seed.practice_sessions = [
      {
        ...seed.practice_sessions[0],
        id: 'session-empty',
        question_order: ['missing-question'],
        total_questions: 1,
      },
    ]
    const empty = createFakeSupabase(seed)

    await expect(
      fetchPracticeSession('session-empty', asClient(empty)),
    ).rejects.toThrow('這場練習沒有可用的題目。')
  })
})

describe('startPracticeSession', () => {
  it('creates a session and resumes the active one with its own options', async () => {
    const fake = createFakeSupabase(createSeedTables())
    const client = asClient(fake)

    const created = await startPracticeSession(
      'english-collocations',
      { mode: 'random' },
      client,
    )
    expect(created.mode).toBe('random')
    expect(created.status).toBe('in_progress')
    expect(created.totalQuestions).toBe(20)
    expect(created.answeredCount).toBe(0)

    const resumed = await startPracticeSession(
      'english-collocations',
      { mode: 'sequential', limit: 3 },
      client,
    )
    expect(resumed.id).toBe(created.id)
    expect(resumed.mode).toBe('random')
    expect(resumed.totalQuestions).toBe(20)
  })

  it('limits the question count', async () => {
    const fake = createFakeSupabase(createSeedTables())

    const created = await startPracticeSession(
      'english-collocations',
      { mode: 'sequential', limit: 5 },
      asClient(fake),
    )

    expect(created.totalQuestions).toBe(5)
    expect(created.questionOrder).toHaveLength(5)
  })

  it('builds a drill from the wrong answers of a source session', async () => {
    const seed = createSeedTables()
    seed.attempts[0].is_correct = false
    seed.practice_sessions[0].status = 'completed'
    seed.practice_sessions[0].completed_at = '2026-11-14T00:00:00.000Z'
    const fake = createFakeSupabase(seed)

    const created = await startPracticeSession(
      'biology',
      { mode: 'sequential', sourceSessionId: 'session-biology' },
      asClient(fake),
    )

    expect(created.sourceSessionId).toBe('session-biology')
    expect(created.totalQuestions).toBe(1)
    expect(created.questionOrder).toEqual(['bio-1'])
  })

  it('starts another session once the previous one is finished', async () => {
    const fake = createFakeSupabase(createSeedTables())
    const client = asClient(fake)

    const first = await startPracticeSession(
      'english-collocations',
      { mode: 'sequential' },
      client,
    )
    await finishPracticeSession(first.id, client)
    const second = await startPracticeSession(
      'english-collocations',
      { mode: 'sequential' },
      client,
    )

    expect(second.id).not.toBe(first.id)
    expect(
      fake.tables.practice_sessions.filter(
        (row) => row.set_id === 'english-collocations',
      ),
    ).toHaveLength(2)
  })

  it('reports RPC errors', async () => {
    const fake = createFakeSupabase(createSeedTables())
    fake.failNextRpc('start_practice_session', { message: 'set has no questions' })

    await expect(
      startPracticeSession('biology', { mode: 'sequential' }, asClient(fake)),
    ).rejects.toThrow('無法開始練習，請稍後再試。')
  })
})

describe('practice session lifecycle', () => {
  it('finishes a session without clearing its attempts', async () => {
    const fake = createFakeSupabase(createSeedTables())
    const client = asClient(fake)

    const finished = await finishPracticeSession('session-biology', client)

    expect(finished.status).toBe('completed')
    expect(finished.completedAt).not.toBeNull()
    expect(finished.answeredCount).toBe(2)
    expect(fake.tables.attempts).toHaveLength(2)
  })

  it('deletes a session together with its attempts', async () => {
    const fake = createFakeSupabase(createSeedTables())

    await deletePracticeSession('session-biology', asClient(fake))

    expect(fake.tables.practice_sessions).toHaveLength(0)
    expect(fake.tables.attempts).toHaveLength(0)
  })

  it('clears every session of a set', async () => {
    const fake = createFakeSupabase(createSeedTables())

    await deletePracticeSessionsForSet('biology', asClient(fake))

    expect(fake.tables.practice_sessions).toHaveLength(0)
    expect(fake.tables.attempts).toHaveLength(0)
  })

  it('reports a missing session', async () => {
    const fake = createFakeSupabase(createSeedTables())

    await expect(
      deletePracticeSession('missing', asClient(fake)),
    ).rejects.toThrow('找不到練習紀錄，或沒有刪除權限。')
    await expect(
      finishPracticeSession('missing', asClient(fake)),
    ).rejects.toThrow('找不到練習紀錄，或沒有修改權限。')
  })
})

describe('submitPracticeAnswer', () => {
  it('inserts a new attempt and then updates the same attempt', async () => {
    const fake = createFakeSupabase(createSeedTables())
    const client = asClient(fake)
    const session = await startPracticeSession(
      'english-collocations',
      { mode: 'sequential' },
      client,
    )
    const detail = await fetchPracticeSession(session.id, client)
    const question = detail?.questions[0]
    expect(question).toBeDefined()

    const first = await submitPracticeAnswer(
      {
        sessionId: session.id,
        questionId: question!.id,
        selected: ['A'],
        durationMs: 1200,
      },
      client,
    )
    expect(first).toMatchObject({
      isCorrect: true,
      alreadyAnswered: false,
      wasUpdated: false,
      sessionStatus: 'in_progress',
      answeredCount: 1,
      correctCount: 1,
      currentIndex: 1,
    })

    const updated = await submitPracticeAnswer(
      {
        sessionId: session.id,
        questionId: question!.id,
        selected: ['B'],
        durationMs: 800,
      },
      client,
    )
    expect(updated).toMatchObject({
      isCorrect: false,
      alreadyAnswered: true,
      wasUpdated: true,
      answeredCount: 1,
      correctCount: 0,
    })

    const unchanged = await submitPracticeAnswer(
      {
        sessionId: session.id,
        questionId: question!.id,
        selected: ['B'],
        durationMs: 400,
      },
      client,
    )
    expect(unchanged.wasUpdated).toBe(false)
  })

  it('reports permission errors from the RPC', async () => {
    const fake = createFakeSupabase(createSeedTables())
    fake.failNextRpc('submit_answer', { message: 'row-level security' })

    await expect(
      submitPracticeAnswer(
        {
          sessionId: 'session-biology',
          questionId: 'bio-1',
          selected: ['B'],
        },
        asClient(fake),
      ),
    ).rejects.toThrow('沒有權限執行此操作，請重新登入後再試一次。')
  })
})
