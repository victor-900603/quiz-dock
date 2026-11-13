import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '../../types/database'
import {
  TEST_OWNER_ID,
  createFakeSupabase,
  createSeedTables,
  type FakeSupabase,
} from '../../test/fakeSupabase'
import { addMark, fetchMarks, removeMark } from './marksService'

function client(fake: FakeSupabase): SupabaseClient<Database> {
  return fake as unknown as SupabaseClient<Database>
}

describe('fetchMarks', () => {
  it('joins marks with questions and sets in newest-first order', async () => {
    const fake = createFakeSupabase(createSeedTables())
    const marks = await fetchMarks(client(fake))

    expect(marks).toHaveLength(10)
    expect(marks[0]).toMatchObject({
      id: 'bio-1',
      setId: 'biology',
      setTitle: '生物學基礎',
      number: 1,
      topic: '細胞結構',
      prompt: '下列哪一個構造負責調控物質進出細胞？',
      correctAnswers: ['B'],
      explanation: '細胞膜具有選擇透性，負責調控物質進出細胞。',
      markedAt: '2026-11-13T09:35:00.000Z',
    })
    expect(marks[0].options).toEqual([
      { key: 'A', text: '細胞核' },
      { key: 'B', text: '細胞膜' },
      { key: 'C', text: '粒線體' },
      { key: 'D', text: '核糖體' },
    ])
    expect(marks.map((mark) => mark.id)).toEqual([
      'bio-1',
      'history-2',
      'bio-3',
      'english-4',
      'bio-5',
      'history-9',
      'english-17',
      'history-18',
      'cs-7',
      'cs-14',
    ])
  })

  it('returns an empty list when there are no marks', async () => {
    const fake = createFakeSupabase()

    await expect(fetchMarks(client(fake))).resolves.toEqual([])
  })

  it('resolves topic labels from the set', async () => {
    const seed = createSeedTables()
    seed.quiz_sets = seed.quiz_sets.map((set) =>
      set.id === 'biology'
        ? { ...set, topic_labels: { 細胞結構: '細胞概論' } }
        : set,
    )
    const fake = createFakeSupabase(seed)

    const marks = await fetchMarks(client(fake))
    expect(marks[0].topic).toBe('細胞概論')
  })

  it('skips marks whose question or set is unavailable', async () => {
    const seed = createSeedTables()
    seed.questions = seed.questions.filter((question) => question.id !== 'bio-1')
    const missingQuestion = createFakeSupabase(seed)

    const withoutQuestion = await fetchMarks(client(missingQuestion))
    expect(withoutQuestion).toHaveLength(9)
    expect(withoutQuestion.some((mark) => mark.id === 'bio-1')).toBe(false)

    const emptyQuestions = createFakeSupabase({
      question_marks: [{ user_id: TEST_OWNER_ID, question_id: 'missing', created_at: '2026-01-01T00:00:00.000Z' }],
    })
    await expect(fetchMarks(client(emptyQuestions))).resolves.toEqual([])
  })

  it('maps query errors', async () => {
    const markFailure = createFakeSupabase(createSeedTables())
    markFailure.failNextSelect('question_marks', { message: 'Failed to fetch' })
    await expect(fetchMarks(client(markFailure))).rejects.toThrow(
      '無法連線到伺服器，請檢查網路後再試一次。',
    )

    const questionFailure = createFakeSupabase(createSeedTables())
    questionFailure.failNextSelect('questions', {
      message: 'row-level security policy',
    })
    await expect(fetchMarks(client(questionFailure))).rejects.toThrow(
      '沒有權限執行此操作，請重新登入後再試一次。',
    )

    const setFailure = createFakeSupabase(createSeedTables())
    setFailure.failNextSelect('quiz_sets', { message: 'fetch failed' })
    await expect(fetchMarks(client(setFailure))).rejects.toThrow(
      '無法連線到伺服器，請檢查網路後再試一次。',
    )
  })
})

describe('addMark and removeMark', () => {
  it('inserts and deletes the mark for the user', async () => {
    const fake = createFakeSupabase(createSeedTables())
    const initialCount = fake.tables.question_marks.length

    await addMark('bio-2', TEST_OWNER_ID, client(fake))
    expect(fake.tables.question_marks).toHaveLength(initialCount + 1)
    expect(
      fake.tables.question_marks.some(
        (row) => row.question_id === 'bio-2' && row.user_id === TEST_OWNER_ID,
      ),
    ).toBe(true)

    await removeMark('bio-2', TEST_OWNER_ID, client(fake))
    expect(fake.tables.question_marks).toHaveLength(initialCount)
  })

  it('maps insert and delete errors', async () => {
    const insertFailure = createFakeSupabase(createSeedTables())
    insertFailure.failNextAction('question_marks', 'insert', {
      message: 'row-level security',
    })
    await expect(
      addMark('bio-2', TEST_OWNER_ID, client(insertFailure)),
    ).rejects.toThrow('沒有權限執行此操作，請重新登入後再試一次。')

    const deleteFailure = createFakeSupabase(createSeedTables())
    deleteFailure.failNextAction('question_marks', 'delete', {
      message: 'Failed to fetch',
    })
    await expect(
      removeMark('bio-1', TEST_OWNER_ID, client(deleteFailure)),
    ).rejects.toThrow('無法連線到伺服器，請檢查網路後再試一次。')
  })
})
