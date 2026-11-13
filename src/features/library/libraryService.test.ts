import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '../../types/database'
import {
  TEST_OWNER_ID,
  createFakeSupabase,
  type FakeRow,
  type FakeSupabase,
} from '../../test/fakeSupabase'
import {
  QUESTION_PAGE_SIZE,
  deleteQuizSet,
  fetchSetDetail,
  fetchSets,
  mapQuestion,
  mapSet,
  parseOptions,
  parseTopicLabels,
  renameQuizSet,
  topicLabel,
} from './libraryService'

function client(fake: FakeSupabase): SupabaseClient<Database> {
  return fake as unknown as SupabaseClient<Database>
}

function setRow(overrides: FakeRow = {}): FakeRow {
  return {
    id: 'set-1',
    owner_id: TEST_OWNER_ID,
    title: '題庫一',
    description: '描述',
    topic_labels: {},
    is_public: false,
    source_filename: null,
    source_hash: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function questionRow(overrides: FakeRow = {}): FakeRow {
  return {
    id: 'question-1',
    set_id: 'set-1',
    owner_id: TEST_OWNER_ID,
    question_number: 1,
    topic: '1',
    question: '題目內容',
    options: [
      { key: 'A', text: '選項甲' },
      { key: 'B', text: '選項乙' },
    ],
    correct_answers: ['A'],
    explanation: '解析內容',
    content_hash: 'hash-1',
    sort_order: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('libraryService mapping', () => {
  it('parses topic labels and options defensively', () => {
    expect(parseTopicLabels(null)).toEqual({})
    expect(parseTopicLabels({ '1': '主題一', '2': 2 })).toEqual({ '1': '主題一' })
    expect(parseOptions(null)).toEqual([])
    expect(parseOptions([{ key: 'A', text: '甲' }, { key: '', text: '乙' }, 'x'])).toEqual([
      { key: 'A', text: '甲' },
    ])
    expect(topicLabel(null, {})).toBe('未分類')
    expect(topicLabel('1', { '1': '主題一' })).toBe('主題一')
    expect(topicLabel('2', {})).toBe('主題 2')
  })

  it('maps sets and questions without practice statistics', () => {
    const set = mapSet(
      setRow({ topic_labels: { '1': '主題一' } }) as never,
      [{ topic: '1' }, { topic: null }],
    )

    expect(set).toMatchObject({
      id: 'set-1',
      title: '題庫一',
      description: '描述',
      questionCount: 2,
      topicCount: 2,
      accuracy: null,
      answeredCount: 0,
      lastPracticedLabel: null,
      topics: [
        { name: '主題一', total: 1, answered: 0, correct: 0 },
        { name: '未分類', total: 1, answered: 0, correct: 0 },
      ],
    })

    const question = mapQuestion(questionRow() as never, { '1': '主題一' })
    expect(question).toMatchObject({
      id: 'question-1',
      number: 1,
      topic: '主題一',
      prompt: '題目內容',
      correctAnswers: ['A'],
      explanation: '解析內容',
    })
    expect(question.options).toEqual([
      { key: 'A', text: '選項甲' },
      { key: 'B', text: '選項乙' },
    ])
  })

  it('falls back to sort order when question_number is null', () => {
    const question = mapQuestion(
      questionRow({ question_number: null, sort_order: 4 }) as never,
    )
    expect(question.number).toBe(5)
    expect(question.explanation).toBe('解析內容')
  })
})

describe('fetchSets', () => {
  it('returns an empty list when there are no sets', async () => {
    const fake = createFakeSupabase()
    await expect(fetchSets(client(fake))).resolves.toEqual([])
  })

  it('aggregates question and topic counts per set', async () => {
    const fake = createFakeSupabase({
      quiz_sets: [
        setRow({ id: 'set-1', created_at: '2026-01-01T00:00:00.000Z' }),
        setRow({
          id: 'set-2',
          title: '題庫二',
          description: null,
          created_at: '2026-02-01T00:00:00.000Z',
        }),
      ],
      questions: [
        questionRow({ id: 'q1', set_id: 'set-1', topic: '1' }),
        questionRow({ id: 'q2', set_id: 'set-1', topic: null }),
        questionRow({ id: 'q3', set_id: 'set-2', topic: '2' }),
      ],
    })

    const sets = await fetchSets(client(fake))

    expect(sets.map((set) => set.id)).toEqual(['set-2', 'set-1'])
    expect(sets[0]).toMatchObject({ questionCount: 1, topicCount: 1, description: '' })
    expect(sets[1]).toMatchObject({ questionCount: 2, topicCount: 2 })
  })

  it('maps set and question query errors', async () => {
    const setFailure = createFakeSupabase()
    setFailure.failNextSelect('quiz_sets', { message: 'Failed to fetch' })
    await expect(fetchSets(client(setFailure))).rejects.toThrow('無法連線到伺服器')

    const questionFailure = createFakeSupabase({
      quiz_sets: [setRow()],
      questions: [questionRow()],
    })
    questionFailure.failNextSelect('questions', {
      message: 'new row violates row-level security policy',
    })
    await expect(fetchSets(client(questionFailure))).rejects.toThrow(
      '沒有權限執行此操作',
    )
  })
})

describe('fetchSetDetail', () => {
  it('returns null when the set does not exist', async () => {
    const fake = createFakeSupabase()
    await expect(fetchSetDetail('missing', client(fake))).resolves.toBeNull()
  })

  it('returns the set and ordered questions', async () => {
    const fake = createFakeSupabase({
      quiz_sets: [setRow({ topic_labels: { '1': '主題一' } })],
      questions: [
        questionRow({ id: 'q2', sort_order: 1, question: '第二題' }),
        questionRow({ id: 'q1', sort_order: 0, question: '第一題' }),
      ],
    })

    const detail = await fetchSetDetail('set-1', client(fake))

    expect(detail?.set.title).toBe('題庫一')
    expect(detail?.questions.map((question) => question.prompt)).toEqual([
      '第一題',
      '第二題',
    ])
    expect(detail?.questions[0].topic).toBe('主題一')
  })

  it('maps set and question query errors', async () => {
    const setFailure = createFakeSupabase()
    setFailure.failNextSelect('quiz_sets', { message: 'permission denied' })
    await expect(fetchSetDetail('set-1', client(setFailure))).rejects.toThrow(
      '沒有權限執行此操作',
    )

    const questionFailure = createFakeSupabase({
      quiz_sets: [setRow()],
      questions: [questionRow()],
    })
    questionFailure.failNextSelect('questions', { message: 'fetch failed' })
    await expect(fetchSetDetail('set-1', client(questionFailure))).rejects.toThrow(
      '無法連線到伺服器',
    )
  })

  it('loads question pages beyond the default page size', async () => {
    const questions = Array.from({ length: QUESTION_PAGE_SIZE + 1 }, (_, index) =>
      questionRow({
        id: `question-${index}`,
        sort_order: index,
        question: `題目 ${index}`,
      }),
    )
    const fake = createFakeSupabase({
      quiz_sets: [setRow()],
      questions,
    })

    const detail = await fetchSetDetail('set-1', client(fake))
    expect(detail?.questions).toHaveLength(QUESTION_PAGE_SIZE + 1)
    expect(detail?.questions.at(-1)?.prompt).toBe(`題目 ${QUESTION_PAGE_SIZE}`)

    const sets = await fetchSets(client(fake))
    expect(sets[0].questionCount).toBe(QUESTION_PAGE_SIZE + 1)
  })
})

describe('renameQuizSet', () => {
  it('trims and updates the title', async () => {
    const fake = createFakeSupabase({ quiz_sets: [setRow()] })

    await expect(renameQuizSet('set-1', '  新標題  ', client(fake))).resolves.toBe(
      '新標題',
    )
    expect(fake.tables.quiz_sets[0].title).toBe('新標題')
  })

  it('rejects blank titles and missing sets', async () => {
    const fake = createFakeSupabase({ quiz_sets: [setRow()] })
    await expect(renameQuizSet('set-1', '   ', client(fake))).rejects.toThrow(
      '題庫標題不可空白',
    )
    await expect(renameQuizSet('missing', '新標題', client(fake))).rejects.toThrow(
      '找不到題庫，或沒有修改權限',
    )
  })

  it('maps update errors', async () => {
    const fake = createFakeSupabase({ quiz_sets: [setRow()] })
    fake.failNextAction('quiz_sets', 'update', { message: 'Failed to fetch' })

    await expect(renameQuizSet('set-1', '新標題', client(fake))).rejects.toThrow(
      '無法連線到伺服器',
    )
  })
})

describe('deleteQuizSet', () => {
  it('deletes the set and cascades questions', async () => {
    const fake = createFakeSupabase({
      quiz_sets: [setRow()],
      questions: [questionRow()],
    })

    await expect(deleteQuizSet('set-1', client(fake))).resolves.toBe('set-1')
    expect(fake.tables.quiz_sets).toHaveLength(0)
    expect(fake.tables.questions).toHaveLength(0)
  })

  it('rejects missing sets', async () => {
    const fake = createFakeSupabase()
    await expect(deleteQuizSet('missing', client(fake))).rejects.toThrow(
      '找不到題庫，或沒有刪除權限',
    )
  })

  it('maps delete errors', async () => {
    const fake = createFakeSupabase({ quiz_sets: [setRow()] })
    fake.failNextAction('quiz_sets', 'delete', { message: 'row-level security' })

    await expect(deleteQuizSet('set-1', client(fake))).rejects.toThrow(
      '沒有權限執行此操作',
    )
  })
})
