import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '../../types/database'
import type { ImportPayload } from '../../schemas/import'
import { ImportError } from '../../schemas/import'
import { IMPORT_BATCH_SIZE, importQuizSet } from './importService'
import { TEST_OWNER_ID, createFakeSupabase, type FakeSupabase } from '../../test/fakeSupabase'

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

function question(index: number, overrides: Record<string, unknown> = {}) {
  return {
    question_number: index + 1,
    topic: '1',
    question: `題目 ${index + 1}`,
    options: { A: '選項甲', B: '選項乙' },
    correct_answers: ['A'],
    explanation: `解析 ${index + 1}`,
    ...overrides,
  }
}

async function expectImportError(
  promise: Promise<unknown>,
  code: string,
): Promise<ImportError> {
  try {
    await promise
  } catch (error) {
    expect(error).toBeInstanceOf(ImportError)
    expect((error as ImportError).code).toBe(code)
    return error as ImportError
  }

  throw new Error(`預期匯入失敗，但成功完成（${code}）。`)
}

describe('importQuizSet', () => {
  it('inserts a set and writes questions in batches of 200', async () => {
    const fake = createFakeSupabase()
    const questions = Array.from(
      { length: IMPORT_BATCH_SIZE + 5 },
      (_, index) => question(index),
    )

    const result = await importQuizSet(payload(questions), {
      ownerId: TEST_OWNER_ID,
      client: client(fake),
    })

    expect(result.title).toBe('測試題庫')
    expect(fake.tables.quiz_sets).toHaveLength(1)
    expect(fake.tables.questions).toHaveLength(IMPORT_BATCH_SIZE + 5)
    expect(fake.insertCounts.questions).toBe(2)
    expect(fake.tables.quiz_sets[0].source_hash).toMatch(/^[a-f0-9]{64}$/)
    expect(fake.tables.questions[0]).toMatchObject({
      set_id: result.id,
      owner_id: TEST_OWNER_ID,
      question_number: 1,
      topic: '1',
      sort_order: 0,
    })
  })

  it('ignores duplicate questions within the same import', async () => {
    const fake = createFakeSupabase()
    const duplicated = question(0)

    await importQuizSet(payload([duplicated, duplicated]), {
      ownerId: TEST_OWNER_ID,
      client: client(fake),
    })

    expect(fake.tables.questions).toHaveLength(1)
  })

  it('rejects a duplicate source hash without writing another set', async () => {
    const fake = createFakeSupabase()
    const importPayload = payload([question(0)])

    await importQuizSet(importPayload, {
      ownerId: TEST_OWNER_ID,
      client: client(fake),
    })

    const error = await expectImportError(
      importQuizSet(importPayload, {
        ownerId: TEST_OWNER_ID,
        client: client(fake),
      }),
      'DUPLICATE_SOURCE',
    )

    expect(error.message).toBe('已匯入過相同題庫。')
    expect(fake.tables.quiz_sets).toHaveLength(1)
    expect(fake.tables.questions).toHaveLength(1)
  })

  it('rolls back the set and inserted questions when a later batch fails', async () => {
    const fake = createFakeSupabase()
    const questions = Array.from(
      { length: IMPORT_BATCH_SIZE + 10 },
      (_, index) => question(index),
    )
    fake.failNextInsert('questions', { message: 'batch failed' }, 1)

    const error = await expectImportError(
      importQuizSet(payload(questions), {
        ownerId: TEST_OWNER_ID,
        client: client(fake),
      }),
      'IMPORT_FAILED',
    )

    expect(error.message).toContain('已清除本次資料')
    expect(fake.tables.quiz_sets).toHaveLength(0)
    expect(fake.tables.questions).toHaveLength(0)
  })

  it('rolls back when the first question batch fails', async () => {
    const fake = createFakeSupabase()
    fake.failNextInsert('questions', { message: 'batch failed' })

    const error = await expectImportError(
      importQuizSet(payload([question(0)]), {
        ownerId: TEST_OWNER_ID,
        client: client(fake),
      }),
      'IMPORT_FAILED',
    )

    expect(error.message).toContain('已清除本次資料')
    expect(fake.tables.quiz_sets).toHaveLength(0)
    expect(fake.tables.questions).toHaveLength(0)
  })

  it('reports a rollback failure without hiding the original error', async () => {
    const fake = createFakeSupabase()
    fake.failNextInsert('questions', { message: 'batch failed' })
    fake.failNextAction('quiz_sets', 'delete', { message: 'delete failed' })

    const error = await expectImportError(
      importQuizSet(payload([question(0)]), {
        ownerId: TEST_OWNER_ID,
        client: client(fake),
      }),
      'IMPORT_FAILED',
    )

    expect(error.message).toContain('已清除本次資料')
    expect(error.message).toContain('清除本次資料失敗')
    expect(fake.tables.quiz_sets).toHaveLength(1)
  })

  it('stops before writing when the duplicate check fails', async () => {
    const fake = createFakeSupabase()
    fake.failNextSelect('quiz_sets', { message: 'Failed to fetch' })

    const error = await expectImportError(
      importQuizSet(payload([question(0)]), {
        ownerId: TEST_OWNER_ID,
        client: client(fake),
      }),
      'IMPORT_FAILED',
    )

    expect(error.message).toContain('無法連線到伺服器')
    expect(fake.tables.quiz_sets).toHaveLength(0)
    expect(fake.tables.questions).toHaveLength(0)
  })

  it('maps row-level security failures to a permission message', async () => {
    const fake = createFakeSupabase()
    fake.failNextInsert('questions', {
      message: 'new row violates row-level security policy',
    })

    const error = await expectImportError(
      importQuizSet(payload([question(0)]), {
        ownerId: TEST_OWNER_ID,
        client: client(fake),
      }),
      'IMPORT_FAILED',
    )

    expect(error.message).toContain('沒有權限執行此操作')
    expect(fake.tables.quiz_sets).toHaveLength(0)
  })

  it('maps network failures when creating the set', async () => {
    const fake = createFakeSupabase()
    fake.failNextInsert('quiz_sets', { message: 'Failed to fetch' })

    const error = await expectImportError(
      importQuizSet(payload([question(0)]), {
        ownerId: TEST_OWNER_ID,
        client: client(fake),
      }),
      'IMPORT_FAILED',
    )

    expect(error.message).toContain('無法連線到伺服器')
    expect(fake.tables.quiz_sets).toHaveLength(0)
  })
})
