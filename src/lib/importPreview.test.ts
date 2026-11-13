import { describe, expect, it } from 'vitest'
import { parseImportPreview } from './importPreview'

describe('parseImportPreview', () => {
  it('rejects invalid JSON', () => {
    expect(parseImportPreview('{oops')).toEqual({
      preview: null,
      error: '無法解析 JSON，請確認格式。',
    })
  })

  it('rejects JSON without a questions array', () => {
    expect(parseImportPreview('{"title":"x"}')).toEqual({
      preview: null,
      error: 'JSON 必須是題目陣列，或包含 questions 陣列的物件。',
    })
    expect(parseImportPreview('null')).toEqual({
      preview: null,
      error: 'JSON 必須是題目陣列，或包含 questions 陣列的物件。',
    })
  })

  it('rejects an empty questions array', () => {
    expect(parseImportPreview('[]')).toEqual({
      preview: null,
      error: '題庫沒有題目。',
    })
  })

  it('previews a plain question array', () => {
    const result = parseImportPreview(
      JSON.stringify([
        { topic: '細胞結構', question: '題目一' },
        { topic: '細胞結構', question: '題目二' },
        { topic: '遺傳學', question: '題目三' },
        { topic: '代謝', question: '題目四' },
      ]),
    )

    expect(result.error).toBeNull()
    expect(result.preview).toMatchObject({
      title: '未命名題庫',
      description: '',
      questionCount: 4,
      sample: ['題目一', '題目二', '題目三'],
    })
    expect(result.preview?.topics).toEqual([
      { name: '細胞結構', count: 2 },
      { name: '遺傳學', count: 1 },
      { name: '代謝', count: 1 },
    ])
  })

  it('previews a wrapped object and falls back for missing fields', () => {
    const result = parseImportPreview(
      JSON.stringify({
        title: '生物題庫',
        description: '每天十題',
        questions: [{ question: '沒有主題' }, null, '不是物件'],
      }),
    )

    expect(result.error).toBeNull()
    expect(result.preview).toMatchObject({
      title: '生物題庫',
      description: '每天十題',
      questionCount: 3,
      sample: ['沒有主題'],
    })
    expect(result.preview?.topics).toEqual([{ name: '未分類', count: 1 }])
  })

  it('treats blank topics as 未分類 and trims topic names', () => {
    const result = parseImportPreview(
      JSON.stringify([
        { topic: '   ', question: '題目一' },
        { topic: ' 細胞結構 ', question: '題目二' },
        { topic: 3, question: '題目三' },
      ]),
    )

    expect(result.preview?.topics).toEqual([
      { name: '未分類', count: 1 },
      { name: '細胞結構', count: 1 },
      { name: '3', count: 1 },
    ])
  })

  it('truncates long sample prompts and uses fallback title', () => {
    const longPrompt = '題'.repeat(120)
    const result = parseImportPreview(JSON.stringify({ questions: [{ question: longPrompt }] }))

    expect(result.preview?.title).toBe('未命名題庫')
    expect(result.preview?.sample[0]).toHaveLength(90)
  })
})
