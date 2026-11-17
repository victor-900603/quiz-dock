import { describe, expect, it } from 'vitest'
import { parseImportPreview } from './importPreview'

function question(overrides: Record<string, unknown> = {}) {
  return {
    topic: '細胞結構',
    question: '題目內容',
    options: { A: '甲', B: '乙' },
    correct_answers: ['A'],
    ...overrides,
  }
}

describe('parseImportPreview', () => {
  it('rejects invalid JSON', async () => {
    expect(await parseImportPreview('{oops')).toEqual({
      preview: null,
      error: '無法解析 JSON，請確認格式。',
    })
  })

  it('rejects JSON without a questions array', async () => {
    const expected = {
      preview: null,
      error: '格式不符合，請確認最外層結構。',
    }

    expect(await parseImportPreview('{"title":"x"}')).toEqual(expected)
    expect(await parseImportPreview('null')).toEqual(expected)
  })

  it('rejects an empty questions array', async () => {
    expect(await parseImportPreview('[]')).toEqual({
      preview: null,
      error: '題庫沒有任何題目。',
    })
  })

  it('previews a plain question array', async () => {
    const result = await parseImportPreview(
      JSON.stringify([
        question({ question: '題目一' }),
        question({ question: '題目二' }),
        question({ question: '題目三', topic: '遺傳學' }),
        question({ question: '題目四', topic: '代謝' }),
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

  it('previews a wrapped object and falls back for missing topics', async () => {
    const result = await parseImportPreview(
      JSON.stringify({
        title: '生物題庫',
        description: '每天十題',
        questions: [
          question({ question: '沒有主題', topic: undefined }),
          question({ question: '第二題' }),
        ],
      }),
    )

    expect(result.error).toBeNull()
    expect(result.preview).toMatchObject({
      title: '生物題庫',
      description: '每天十題',
      questionCount: 2,
    })
    expect(result.preview?.topics).toEqual([
      { name: '未分類', count: 1 },
      { name: '細胞結構', count: 1 },
    ])
  })

  it('accepts data envelopes and question field aliases', async () => {
    const result = await parseImportPreview(
      JSON.stringify({
        name: '別名題庫',
        data: [
          { stem: '題幹一', choices: ['甲', '乙'], answer: 'B' },
          { stem: '題幹二', choices: ['丙', '丁'], answer: 'A' },
        ],
      }),
    )

    expect(result.error).toBeNull()
    expect(result.preview).toMatchObject({
      title: '別名題庫',
      questionCount: 2,
      sample: ['題幹一', '題幹二'],
    })
  })

  it('treats blank topics as 未分類 and trims topic names', async () => {
    const result = await parseImportPreview(
      JSON.stringify([
        question({ question: '題目一', topic: '   ' }),
        question({ question: '題目二', topic: ' 細胞結構 ' }),
        question({ question: '題目三', topic: 3 }),
      ]),
    )

    expect(result.preview?.topics).toEqual([
      { name: '未分類', count: 1 },
      { name: '細胞結構', count: 1 },
      { name: '3', count: 1 },
    ])
  })

  it('truncates long sample prompts and uses fallback title', async () => {
    const longPrompt = '題'.repeat(120)
    const result = await parseImportPreview(
      JSON.stringify({ questions: [question({ question: longPrompt })] }),
    )

    expect(result.preview?.title).toBe('未命名題庫')
    expect(result.preview?.sample[0]).toHaveLength(90)
  })

  it('shows validation errors instead of a preview', async () => {
    const result = await parseImportPreview(
      JSON.stringify([question({ options: { A: '只有一個' } })]),
    )

    expect(result.preview).toBeNull()
    expect(result.error).toContain('至少需要 2 個選項')
  })
})
