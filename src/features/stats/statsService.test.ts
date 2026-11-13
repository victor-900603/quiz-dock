import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '../../types/database'
import {
  TEST_OWNER_ID,
  createFakeSupabase,
  type FakeRow,
  type FakeSupabase,
  type FakeTables,
  type FakeViewName,
} from '../../test/fakeSupabase'
import { fetchSetStats, fetchStatsOverview } from './statsService'

function client(fake: FakeSupabase): SupabaseClient<Database> {
  return fake as unknown as SupabaseClient<Database>
}

function setRow(overrides: FakeRow = {}): FakeRow {
  return {
    id: 'set-a',
    owner_id: TEST_OWNER_ID,
    title: '題庫 A',
    description: null,
    topic_labels: {},
    is_public: false,
    source_filename: null,
    source_hash: null,
    created_at: '2026-11-01T00:00:00.000Z',
    updated_at: '2026-11-01T00:00:00.000Z',
    ...overrides,
  }
}

function questionRow(overrides: FakeRow = {}): FakeRow {
  return {
    id: 'q-a1',
    set_id: 'set-a',
    owner_id: TEST_OWNER_ID,
    question_number: 1,
    topic: '1',
    question: '題目內容',
    options: [
      { key: 'A', text: '選項甲' },
      { key: 'B', text: '選項乙' },
    ],
    correct_answers: ['A'],
    explanation: null,
    content_hash: 'hash-a1',
    sort_order: 0,
    created_at: '2026-11-01T00:00:00.000Z',
    ...overrides,
  }
}

function attemptRow(overrides: FakeRow = {}): FakeRow {
  return {
    id: 'attempt-a1',
    user_id: TEST_OWNER_ID,
    session_id: 'session-a',
    set_id: 'set-a',
    question_id: 'q-a1',
    selected: ['A'],
    is_correct: true,
    duration_ms: null,
    answered_at: '2026-11-13T15:30:00.000Z',
    updated_at: '2026-11-13T15:30:00.000Z',
    ...overrides,
  }
}

function sessionRow(overrides: FakeRow = {}): FakeRow {
  return {
    id: 'session-a',
    user_id: TEST_OWNER_ID,
    set_id: 'set-a',
    mode: 'sequential',
    status: 'in_progress',
    question_order: ['q-a1', 'q-a2', 'q-a3'],
    current_index: 3,
    total_questions: 3,
    answered_count: 3,
    correct_count: 2,
    started_at: '2026-11-13T15:00:00.000Z',
    updated_at: '2026-11-13T15:30:00.000Z',
    completed_at: null,
    ...overrides,
  }
}

function createStatsFixture(): FakeSupabase {
  const seed: Partial<FakeTables> = {
    quiz_sets: [
      setRow({
        id: 'set-a',
        title: '題庫 A',
        topic_labels: { '1': '主題一', '2': '主題二' },
      }),
      setRow({
        id: 'set-b',
        title: '題庫 B',
        topic_labels: { '1': '主題一' },
      }),
    ],
    questions: [
      questionRow({ id: 'q-a1', set_id: 'set-a', topic: '1', sort_order: 0 }),
      questionRow({ id: 'q-a2', set_id: 'set-a', topic: '2', sort_order: 1 }),
      questionRow({ id: 'q-a3', set_id: 'set-a', topic: '1', sort_order: 2 }),
      questionRow({ id: 'q-b1', set_id: 'set-b', topic: '1', sort_order: 0 }),
      questionRow({ id: 'q-b2', set_id: 'set-b', topic: null, sort_order: 1 }),
    ],
    practice_sessions: [
      sessionRow(),
      sessionRow({
        id: 'session-b',
        set_id: 'set-b',
        mode: 'random',
        status: 'completed',
        question_order: ['q-b1', 'q-b2'],
        current_index: 2,
        total_questions: 2,
        answered_count: 2,
        correct_count: 2,
        updated_at: '2026-11-12T01:00:00.000Z',
        completed_at: '2026-11-12T01:00:00.000Z',
      }),
    ],
    attempts: [
      attemptRow(),
      attemptRow({
        id: 'attempt-a2',
        question_id: 'q-a2',
        selected: ['B'],
        is_correct: false,
        answered_at: '2026-11-13T16:30:00.000Z',
        updated_at: '2026-11-13T16:30:00.000Z',
      }),
      attemptRow({
        id: 'attempt-a3',
        question_id: 'q-a3',
        answered_at: '2026-11-07T01:00:00.000Z',
        updated_at: '2026-11-07T01:00:00.000Z',
      }),
      attemptRow({
        id: 'attempt-b1',
        session_id: 'session-b',
        set_id: 'set-b',
        question_id: 'q-b1',
        answered_at: '2026-11-12T01:00:00.000Z',
        updated_at: '2026-11-12T01:00:00.000Z',
      }),
      attemptRow({
        id: 'attempt-b2',
        session_id: 'session-b',
        set_id: 'set-b',
        question_id: 'q-b2',
        answered_at: '2026-11-06T01:00:00.000Z',
        updated_at: '2026-11-06T01:00:00.000Z',
      }),
    ],
  }

  return createFakeSupabase(seed)
}

const now = new Date('2026-11-13T12:00:00.000Z')

describe('fetchStatsOverview', () => {
  it('aggregates set, topic, session, and daily statistics', async () => {
    const stats = await fetchStatsOverview(client(createStatsFixture()), now)

    expect(stats.totalAnswered).toBe(5)
    expect(stats.totalCorrect).toBe(4)
    expect(stats.practicedSets).toBe(2)
    expect(stats.weeklyAnswered).toBe(3)

    expect(stats.setStats.map((item) => [item.title, item.answered, item.correct])).toEqual([
      ['題庫 A', 3, 2],
      ['題庫 B', 2, 2],
    ])

    expect(stats.topicStats[0]).toMatchObject({
      name: '主題一',
      answered: 3,
      correct: 3,
    })
    expect(stats.topicStats).toEqual(
      expect.arrayContaining([
        { name: '主題二', answered: 1, correct: 0 },
        { name: '未分類', answered: 1, correct: 1 },
      ]),
    )

    expect(stats.recentSessions).toHaveLength(2)
    expect(stats.recentSessions[0]).toMatchObject({
      id: 'session-a',
      setTitle: '題庫 A',
      mode: 'sequential',
      status: 'in_progress',
      answered: 3,
      correct: 2,
    })
    expect(stats.recentSessions[1]).toMatchObject({
      id: 'session-b',
      setTitle: '題庫 B',
      mode: 'random',
      status: 'completed',
      answered: 2,
      correct: 2,
    })

    expect(stats.dailyActivity).toHaveLength(14)
    expect(stats.dailyActivity[0].day).toBe('2026-10-31')
    expect(stats.dailyActivity[13]).toMatchObject({
      day: '2026-11-13',
      label: '11/13',
      answered: 1,
      correct: 1,
    })
    expect(stats.dailyActivity.find((item) => item.day === '2026-11-06')).toMatchObject({
      answered: 1,
      correct: 1,
    })
    expect(stats.dailyActivity.find((item) => item.day === '2026-11-08')).toMatchObject({
      answered: 0,
      correct: 0,
    })
  })

  it('uses Taipei dates for daily activity boundaries', async () => {
    const nextDay = new Date('2026-11-14T12:00:00.000Z')
    const stats = await fetchStatsOverview(client(createStatsFixture()), nextDay)

    const beforeMidnight = stats.dailyActivity.find(
      (item) => item.day === '2026-11-13',
    )
    const afterMidnight = stats.dailyActivity.find(
      (item) => item.day === '2026-11-14',
    )

    expect(beforeMidnight?.answered).toBe(1)
    expect(afterMidnight?.answered).toBe(1)
  })

  it('returns an empty overview when there are no attempts or sessions', async () => {
    const stats = await fetchStatsOverview(client(createFakeSupabase()), now)

    expect(stats).toMatchObject({
      totalAnswered: 0,
      totalCorrect: 0,
      practicedSets: 0,
      weeklyAnswered: 0,
      setStats: [],
      topicStats: [],
      recentSessions: [],
    })
    expect(stats.dailyActivity).toHaveLength(14)
    expect(stats.dailyActivity.every((item) => item.answered === 0)).toBe(true)
  })

  it('limits recent sessions to the latest 10', async () => {
    const sessions = Array.from({ length: 12 }, (_, index) => {
      const day = String(index + 1).padStart(2, '0')

      return sessionRow({
        id: `session-${index + 1}`,
        updated_at: `2026-11-${day}T00:00:00.000Z`,
        completed_at: `2026-11-${day}T00:00:00.000Z`,
      })
    })
    const fake = createFakeSupabase({
      quiz_sets: [setRow()],
      practice_sessions: sessions,
    })

    const stats = await fetchStatsOverview(client(fake), now)

    expect(stats.recentSessions).toHaveLength(10)
    expect(stats.recentSessions[0].id).toBe('session-12')
    expect(stats.recentSessions[9].id).toBe('session-3')
  })

  it('describes Supabase errors with the shared formatter', async () => {
    const fake = createStatsFixture()
    fake.failNextSelect('v_set_stats', { message: 'Failed to fetch' })

    await expect(fetchStatsOverview(client(fake), now)).rejects.toThrow(
      '無法連線到伺服器，請檢查網路後再試一次。',
    )
  })

  it('uses fallback messages for each statistics view', async () => {
    const cases: Array<[FakeViewName, string]> = [
      ['v_topic_stats', '無法載入主題統計，請稍後再試。'],
      ['v_daily_activity', '無法載入每日活動，請稍後再試。'],
      ['v_session_summary', '無法載入練習場次，請稍後再試。'],
    ]

    for (const [view, message] of cases) {
      const fake = createStatsFixture()
      fake.failNextSelect(view, { message: 'boom' })

      await expect(fetchStatsOverview(client(fake), now)).rejects.toThrow(message)
    }
  })

  it('describes errors while loading set titles', async () => {
    const fake = createStatsFixture()
    fake.failNextSelect('quiz_sets', { message: 'row-level security' })

    await expect(fetchStatsOverview(client(fake), now)).rejects.toThrow(
      '沒有權限執行此操作，請重新登入後再試一次。',
    )
  })
})

describe('fetchSetStats', () => {
  it('returns a set summary with topic breakdowns', async () => {
    const result = await fetchSetStats('set-a', client(createStatsFixture()))

    expect(result).not.toBeNull()
    expect(result?.set).toMatchObject({
      setId: 'set-a',
      title: '題庫 A',
      answered: 3,
      correct: 2,
    })
    expect(result?.topics).toEqual(
      expect.arrayContaining([
        { name: '主題一', answered: 2, correct: 2 },
        { name: '主題二', answered: 1, correct: 0 },
      ]),
    )
  })

  it('returns zero counts when the set has no attempts', async () => {
    const fake = createFakeSupabase({
      quiz_sets: [setRow({ id: 'set-empty', title: '空題庫' })],
    })

    const result = await fetchSetStats('set-empty', client(fake))

    expect(result?.set).toMatchObject({
      setId: 'set-empty',
      title: '空題庫',
      answered: 0,
      correct: 0,
      accuracy: null,
      lastAnsweredAt: null,
    })
    expect(result?.topics).toEqual([])
  })

  it('returns null when the set does not exist', async () => {
    const result = await fetchSetStats('missing', client(createStatsFixture()))

    expect(result).toBeNull()
  })
})
