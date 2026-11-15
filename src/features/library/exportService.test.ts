import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '../../types/database'
import type { ImportPayload } from '../../schemas/import'
import { normalizeImport } from '../../schemas/import'
import { importQuizSet } from './importService'
import {
  buildExportDocument,
  exportFileName,
  exportQuizSet,
} from './exportService'
import {
  TEST_OWNER_ID,
  createFakeSupabase,
  type FakeSupabase,
} from '../../test/fakeSupabase'

function client(fake: FakeSupabase): SupabaseClient<Database> {
  return fake as unknown as SupabaseClient<Database>
}

function payload(questions: unknown[], title = '生物學'): ImportPayload {
  return {
    text: JSON.stringify({ title, questions }),
    fileName: 'biology.json',
    title,
  }
}

function question(overrides: Record<string, unknown> = {}) {
  return {
    question_number: 1,
    topic: '1',
    question: '題目內容',
    options: { A: '選項甲', B: '選項乙' },
    correct_answers: ['B', 'A'],
    explanation: '解析內容',
    ...overrides,
  }
}

describe('exportFileName', () => {
  it('replaces characters that are invalid in file names', () => {
    expect(exportFileName('生物/第一章:重點?')).toBe('生物_第一章_重點_.json')
  })

  it('falls back to a generic name when the title is blank', () => {
    expect(exportFileName('   ')).toBe('quiz.json')
  })
})

describe('buildExportDocument', () => {
  it('omits empty optional fields and sorts answers', () => {
    const document = buildExportDocument(
      {
        id: 'set-1',
        owner_id: TEST_OWNER_ID,
        title: '題庫',
        description: '',
        topic_labels: {},
        is_public: false,
        source_filename: null,
        source_hash: null,
        created_at: '2026-11-15T00:00:00.000Z',
        updated_at: '2026-11-15T00:00:00.000Z',
      },
      [
        {
          id: 'question-1',
          set_id: 'set-1',
          owner_id: TEST_OWNER_ID,
          question_number: 3,
          topic: null,
          question: '題目',
          options: [
            { key: 'B', text: '乙' },
            { key: 'A', text: '甲' },
          ],
          correct_answers: ['B', 'A'],
          explanation: null,
          content_hash: 'hash',
          sort_order: 0,
          created_at: '2026-11-15T00:00:00.000Z',
        },
      ],
    )

    expect(document).not.toHaveProperty('description')
    expect(document).not.toHaveProperty('topic_labels')
    expect(document.questions[0]).toMatchObject({
      question_number: 3,
      topic: null,
      correct_answers: ['A', 'B'],
      explanation: null,
    })
  })
})

describe('exportQuizSet', () => {
  it('round-trips through normalizeImport without changing content', async () => {
    const fake = createFakeSupabase()
    const importPayload = payload([
      question(),
      question({
        question_number: 2,
        topic: '2',
        question: '第二題',
        options: { C: '丙', A: '甲' },
        correct_answers: ['C'],
        explanation: '',
      }),
    ])

    const imported = await importQuizSet(importPayload, {
      ownerId: TEST_OWNER_ID,
      client: client(fake),
    })
    const original = await normalizeImport(importPayload)
    const exported = await exportQuizSet(imported.id, client(fake))
    const reparsed = await normalizeImport({
      text: exported.text,
      fileName: exported.fileName,
      title: '',
    })

    expect(reparsed.questions).toHaveLength(original.questions.length)
    expect(reparsed.questions.map((item) => item.contentHash)).toEqual(
      original.questions.map((item) => item.contentHash),
    )
    expect(reparsed.questions.map((item) => item.options)).toEqual(
      original.questions.map((item) => item.options),
    )
    expect(reparsed.questions.map((item) => item.correctAnswers)).toEqual(
      original.questions.map((item) => item.correctAnswers),
    )
    expect(reparsed.questions.map((item) => item.explanation)).toEqual(
      original.questions.map((item) => item.explanation),
    )
    expect(reparsed.sourceHash).toBe(fake.tables.quiz_sets[0].source_hash)
    expect(reparsed.topicLabels).toEqual(original.topicLabels)
  })

  it('throws when the set does not exist', async () => {
    const fake = createFakeSupabase()

    await expect(exportQuizSet('missing', client(fake))).rejects.toThrow(
      '找不到題庫，或沒有匯出權限。',
    )
  })
})
