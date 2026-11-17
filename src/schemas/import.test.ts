import { describe, expect, it } from 'vitest'
import {
  IMPORT_LIMITS,
  ImportError,
  formatImportIssues,
  normalizeImport,
  type ImportPayload,
} from './import'

function payload(
  data: unknown,
  fileName = 'quiz.json',
  title = '',
): ImportPayload {
  return {
    text: typeof data === 'string' ? data : JSON.stringify(data),
    fileName,
    title,
  }
}

function question(overrides: Record<string, unknown> = {}) {
  return {
    question_number: 1,
    topic: 1,
    question: '題目內容',
    options: { A: '選項甲', B: '選項乙' },
    correct_answers: ['A'],
    explanation: '解析內容',
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

describe('normalizeImport', () => {
  it('normalizes a plain question array and derives the title from the file name', async () => {
    const result = await normalizeImport(
      payload(
        [
          {
            question_number: ' 2 ',
            topic: 3,
            question: '  題目內容  ',
            options: { ' b ': '選項乙', a: '選項甲' },
            correct_answers: [' b ', 'A', 'a'],
            explanation: '  解析內容  ',
          },
        ],
        '生物學.json',
      ),
    )

    expect(result.title).toBe('生物學')
    expect(result.description).toBeNull()
    expect(result.topicLabels).toEqual({})
    expect(result.sourceFilename).toBe('生物學.json')
    expect(result.questions).toHaveLength(1)
    expect(result.questions[0]).toMatchObject({
      questionNumber: 2,
      topic: '3',
      question: '題目內容',
      options: [
        { key: 'A', text: '選項甲' },
        { key: 'B', text: '選項乙' },
      ],
      correctAnswers: ['A', 'B'],
      explanation: '解析內容',
      sortOrder: 0,
    })
    expect(result.questions[0].contentHash).toMatch(/^[a-f0-9]{64}$/)
    expect(result.sourceHash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('normalizes a wrapped object, topic labels, and option arrays', async () => {
    const result = await normalizeImport(
      payload(
        {
          title: '  AWS SAA  ',
          description: '  練習題  ',
          topic_labels: { '1': '儲存與資料庫', ' 2 ': 2, empty: null },
          questions: [
            {
              question: '題目內容',
              options: [
                { key: 'b', text: '選項乙' },
                { key: 'a', text: '選項甲' },
              ],
              correct_answers: 'a',
            },
          ],
        },
        '',
        '',
      ),
    )

    expect(result.title).toBe('AWS SAA')
    expect(result.description).toBe('練習題')
    expect(result.topicLabels).toEqual({ '1': '儲存與資料庫', '2': '2' })
    expect(result.sourceFilename).toBeNull()
    expect(result.questions[0].questionNumber).toBe(1)
    expect(result.questions[0].topic).toBeNull()
    expect(result.questions[0].options.map((option) => option.key)).toEqual(['A', 'B'])
    expect(result.questions[0].correctAnswers).toEqual(['A'])
  })

  it('prefers the edited title and falls back to 未命名題庫', async () => {
    const edited = await normalizeImport(
      payload({ questions: [question()] }, 'quiz.json', ' 自訂標題 '),
    )
    expect(edited.title).toBe('自訂標題')

    const fallback = await normalizeImport(payload([question()], ''))
    expect(fallback.title).toBe('未命名題庫')
  })

  it('produces stable content and source hashes', async () => {
    const first = await normalizeImport(payload([question()]))
    const second = await normalizeImport(
      payload([
        {
          ...question(),
          options: { B: '選項乙', A: '選項甲' },
          correct_answers: 'A',
          question: '  題目內容 ',
        },
      ]),
    )

    expect(first.questions[0].contentHash).toBe(second.questions[0].contentHash)
    expect(first.sourceHash).toBe(second.sourceHash)

    const changedAnswer = await normalizeImport(
      payload([question({ correct_answers: ['B'] })]),
    )
    expect(changedAnswer.questions[0].contentHash).not.toBe(
      first.questions[0].contentHash,
    )

    const changedTitle = await normalizeImport(
      payload({ title: '另一個題庫', questions: [question()] }),
    )
    expect(changedTitle.sourceHash).not.toBe(first.sourceHash)
  })

  it('produces the same source hash regardless of question order', async () => {
    const firstQuestion = question({ question_number: 1, question: '第一題' })
    const secondQuestion = question({ question_number: 2, question: '第二題' })

    const first = await normalizeImport(
      payload({ title: '排序題庫', questions: [firstQuestion, secondQuestion] }),
    )
    const second = await normalizeImport(
      payload({ title: '排序題庫', questions: [secondQuestion, firstQuestion] }),
    )

    expect(first.sourceHash).toBe(second.sourceHash)
    expect(first.questions.map((item) => item.contentHash).sort()).toEqual(
      second.questions.map((item) => item.contentHash).sort(),
    )
  })

  it('rejects invalid JSON and outer shapes', async () => {
    await expectImportError(normalizeImport(payload('{oops')), 'INVALID_JSON')
    await expectImportError(normalizeImport(payload({ title: 'x' })), 'INVALID_SHAPE')
    await expectImportError(normalizeImport(payload('null')), 'INVALID_SHAPE')
    await expectImportError(normalizeImport(payload({ questions: 'x' })), 'INVALID_SHAPE')
  })

  it('rejects empty and oversized question lists', async () => {
    await expectImportError(normalizeImport(payload([])), 'EMPTY_QUESTIONS')

    const tooMany = Array.from({ length: IMPORT_LIMITS.questionCount + 1 }, () =>
      question(),
    )
    await expectImportError(normalizeImport(payload(tooMany)), 'TOO_MANY_QUESTIONS')
  })

  it('rejects files larger than 10 MB', async () => {
    const oversized = 'x'.repeat(IMPORT_LIMITS.fileBytes + 1)
    await expectImportError(normalizeImport(payload(oversized)), 'FILE_TOO_LARGE')
  })

  it('collects option errors', async () => {
    const tooFew = await expectImportError(
      normalizeImport(payload([question({ options: { A: '只有一個' } })])),
      'INVALID_OPTIONS',
    )
    expect(tooFew.message).toContain('至少需要 2 個選項')

    const tooManyOptions = Object.fromEntries(
      Array.from({ length: IMPORT_LIMITS.optionCount + 1 }, (_, index) => [
        String.fromCharCode(65 + index),
        `選項 ${index}`,
      ]),
    )
    await expectImportError(
      normalizeImport(
        payload([
          question({
            options: tooManyOptions,
            correct_answers: ['A'],
          }),
        ]),
      ),
      'INVALID_OPTIONS',
    )

    const duplicate = await expectImportError(
      normalizeImport(payload([question({ options: { A: '甲', ' a ': '乙' } })])),
      'INVALID_OPTIONS',
    )
    expect(duplicate.message).toContain('選項鍵 A 重複')

    const blankKey = await expectImportError(
      normalizeImport(payload([question({ options: { ' ': '甲', B: '乙' } })])),
      'INVALID_OPTIONS',
    )
    expect(blankKey.message).toContain('選項鍵不可空白')

    await expectImportError(
      normalizeImport(payload([question({ options: 123 })])),
      'INVALID_OPTIONS',
    )
  })

  it('collects correct-answer errors', async () => {
    const missing = await expectImportError(
      normalizeImport(payload([question({ correct_answers: ['C'] })])),
      'INVALID_CORRECT_ANSWERS',
    )
    expect(missing.message).toContain('正確答案 C 不存在於選項')

    const empty = await expectImportError(
      normalizeImport(payload([question({ correct_answers: [] })])),
      'INVALID_CORRECT_ANSWERS',
    )
    expect(empty.message).toContain('至少需要一個正確答案')

    await expectImportError(
      normalizeImport(payload([question({ correct_answers: 3 })])),
      'INVALID_CORRECT_ANSWERS',
    )
  })

  it('collects question text and explanation errors', async () => {
    const blank = await expectImportError(
      normalizeImport(payload([question({ question: '   ' })])),
      'INVALID_QUESTION',
    )
    expect(blank.message).toContain('題幹不可空白')

    const longQuestion = await expectImportError(
      normalizeImport(
        payload([question({ question: '題'.repeat(IMPORT_LIMITS.textLength + 1) })]),
      ),
      'INVALID_QUESTION',
    )
    expect(longQuestion.message).toContain('題幹不可超過')

    const longExplanation = await expectImportError(
      normalizeImport(
        payload([
          question({ explanation: '解'.repeat(IMPORT_LIMITS.textLength + 1) }),
        ]),
      ),
      'INVALID_QUESTION',
    )
    expect(longExplanation.message).toContain('解析不可超過')

    await expectImportError(
      normalizeImport(payload([question({ explanation: 123 })])),
      'INVALID_QUESTION',
    )

    await expectImportError(
      normalizeImport(payload([null])),
      'INVALID_QUESTION',
    )
  })

  it('rejects duplicate question numbers with different content', async () => {
    const error = await expectImportError(
      normalizeImport(payload([question(), question({ question: '另一題' })])),
      'DUPLICATE_QUESTION_NUMBER',
    )

    expect(formatImportIssues(error.issues)).toContain('題號 1 重複')
  })

  it('rejects the same content under different question numbers', async () => {
    const error = await expectImportError(
      normalizeImport(payload([question(), question({ question_number: 2 })])),
      'DUPLICATE_QUESTION',
    )

    expect(formatImportIssues(error.issues)).toContain('內容完全相同')
  })

  it('keeps an exact duplicate row only once', async () => {
    const result = await normalizeImport(payload([question(), question()]))
    expect(result.questions).toHaveLength(1)
  })

  it('accepts common field aliases and derives option keys', async () => {
    const result = await normalizeImport(
      payload({
        name: '別名題庫',
        items: [
          {
            stem: '題幹內容',
            choices: ['甲', '乙', '丙'],
            answer: 'C',
            rationale: '解析內容',
            subject: '細胞',
          },
        ],
      }),
    )

    expect(result.title).toBe('別名題庫')
    expect(result.questions[0]).toMatchObject({
      question: '題幹內容',
      correctAnswers: ['C'],
      explanation: '解析內容',
      topic: '細胞',
      questionNumber: 1,
    })
    expect(result.questions[0].options).toEqual([
      { key: 'A', text: '甲' },
      { key: 'B', text: '乙' },
      { key: 'C', text: '丙' },
    ])
  })

  it('resolves answers written as option text or multiple tokens', async () => {
    const byText = await normalizeImport(
      payload([
        {
          question: '答案用文字',
          options: { A: '細胞核', B: '粒線體' },
          correct_answers: '粒線體',
        },
      ]),
    )
    expect(byText.questions[0].correctAnswers).toEqual(['B'])

    const multiple = await normalizeImport(
      payload([
        {
          question: '多選',
          options: { A: '甲', B: '乙', C: '丙' },
          correct_answers: 'A、C',
        },
      ]),
    )
    expect(multiple.questions[0].correctAnswers).toEqual(['A', 'C'])
  })

  it('resolves numeric answers by key first and then by position', async () => {
    const byKey = await normalizeImport(
      payload([
        {
          question: '數字鍵',
          options: { '1': '甲', '2': '乙' },
          correct_answers: 2,
        },
      ]),
    )
    expect(byKey.questions[0].correctAnswers).toEqual(['2'])

    const byPosition = await normalizeImport(
      payload([
        {
          question: '位置',
          options: { A: '甲', B: '乙', C: '丙' },
          correct_answers: 2,
        },
      ]),
    )
    expect(byPosition.questions[0].correctAnswers).toEqual(['B'])

    await expectImportError(
      normalizeImport(
        payload([
          {
            question: '超出範圍',
            options: { A: '甲', B: '乙' },
            correct_answers: 5,
          },
        ]),
      ),
      'INVALID_CORRECT_ANSWERS',
    )
  })

  it('derives answers from correctness flags and boolean maps', async () => {
    const flaggedOptions = await normalizeImport(
      payload([
        {
          question: '選項標記',
          options: [
            { text: '甲', correct: false },
            { text: '乙', correct: true },
          ],
        },
      ]),
    )
    expect(flaggedOptions.questions[0].options).toEqual([
      { key: 'A', text: '甲' },
      { key: 'B', text: '乙' },
    ])
    expect(flaggedOptions.questions[0].correctAnswers).toEqual(['B'])

    const booleanMap = await normalizeImport(
      payload([
        {
          question: '布林對應',
          options: { A: '甲', B: '乙', C: '丙' },
          correct_answers: { A: true, B: false, C: true },
        },
      ]),
    )
    expect(booleanMap.questions[0].correctAnswers).toEqual(['A', 'C'])
  })

  it('accepts nested envelopes and a byte order mark', async () => {
    const nested = await normalizeImport(
      payload({
        quiz: {
          title: '巢狀題庫',
          questions: [question()],
        },
      }),
    )
    expect(nested.title).toBe('巢狀題庫')
    expect(nested.questions).toHaveLength(1)

    const withBom = await normalizeImport(
      payload(`\ufeff${JSON.stringify([question()])}`),
    )
    expect(withBom.questions).toHaveLength(1)
  })

  it('rejects an invalid question number instead of renumbering', async () => {
    const error = await expectImportError(
      normalizeImport(payload([question({ question_number: 'abc' })])),
      'INVALID_QUESTION',
    )
    expect(error.message).toContain('題號必須是正整數')
  })

  it('collects errors across multiple questions and limits the formatted list', async () => {
    const questions = Array.from({ length: 25 }, (_, index) =>
      question({
        question: '',
        options: { A: '甲' },
        correct_answers: ['Z'],
        explanation: index,
      }),
    )

    const error = await expectImportError(
      normalizeImport(payload(questions)),
      'INVALID_OPTIONS',
    )

    expect(error.issues.length).toBeGreaterThan(20)
    expect(formatImportIssues(error.issues).split('\n')).toHaveLength(20)
    expect(error.message).toContain('第 1 題')
    expect(error.message).toContain('第 5 題')
    expect(error.message).not.toContain('第 6 題')
  })
})
