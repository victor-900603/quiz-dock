import { describe, expect, it } from 'vitest'
import {
  buildCsvQuestions,
  csvHeaders,
  decodeTextBytes,
  detectFormat,
  guessCsvMapping,
  parseCsv,
} from './csvImport'

describe('decodeTextBytes', () => {
  it('decodes UTF-8 text and removes a byte order mark', () => {
    const plain = new TextEncoder().encode('題幹,答案').buffer
    expect(decodeTextBytes(plain)).toBe('題幹,答案')

    const withBom = new Uint8Array([
      0xef,
      0xbb,
      0xbf,
      ...new TextEncoder().encode('題幹,答案'),
    ])
    expect(decodeTextBytes(withBom.buffer)).toBe('題幹,答案')
  })
})

describe('detectFormat', () => {
  it('uses the extension first and falls back to the content shape', () => {
    expect(detectFormat('quiz.csv', '[]')).toBe('csv')
    expect(detectFormat('quiz.tsv', '')).toBe('csv')
    expect(detectFormat('quiz.json', '')).toBe('json')
    expect(detectFormat('', '[{"question":"x"}]')).toBe('json')
    expect(detectFormat('', '題幹,答案\n甲,A')).toBe('csv')
    expect(detectFormat('', '題幹\t答案\n甲\tA')).toBe('csv')
    expect(detectFormat('', 'not a table')).toBe('json')
  })
})

describe('parseCsv', () => {
  it('parses quoted cells, blank lines, and pads short rows', () => {
    const table = parseCsv(
      '題幹,選項A,選項B\r\n"含有,逗號的題幹",甲,乙\r\n\r\n短列,甲\n',
    )

    expect(table).not.toBeNull()
    expect(table?.columnCount).toBe(3)
    expect(table?.rows).toEqual([
      ['題幹', '選項A', '選項B'],
      ['含有,逗號的題幹', '甲', '乙'],
      ['短列', '甲', ''],
    ])
  })

  it('returns null when there is no content', () => {
    expect(parseCsv('   \n\n')).toBeNull()
  })
})

describe('guessCsvMapping', () => {
  it('recognizes common headers', () => {
    const table = parseCsv(
      '題號,題幹,選項A,選項B,選項C,答案,解析,主題\n1,題目,甲,乙,丙,B,說明,細胞',
    )
    const mapping = table ? guessCsvMapping(table) : null

    expect(mapping).toMatchObject({
      hasHeader: true,
      question: 1,
      answer: 5,
      options: [2, 3, 4],
      number: 0,
      topic: 7,
      explanation: 6,
    })
  })

  it('falls back to the first and last columns without a header', () => {
    const table = parseCsv('題目,甲,乙,丙,B\n第二題,丁,戊,己,A')
    const mapping = table ? guessCsvMapping(table, false) : null

    expect(mapping).toMatchObject({
      hasHeader: false,
      question: 0,
      options: [1, 2, 3],
      answer: 4,
      number: null,
      topic: null,
      explanation: null,
    })
  })
})

describe('csvHeaders', () => {
  it('fills blank header cells and generates names without a header row', () => {
    const table = parseCsv('題幹,,選項B\n題目,甲,乙')

    expect(table && csvHeaders(table, true)).toEqual(['題幹', '欄位 2', '選項B'])
    expect(table && csvHeaders(table, false)).toEqual([
      '欄位 1',
      '欄位 2',
      '欄位 3',
    ])
  })
})

describe('buildCsvQuestions', () => {
  const table = parseCsv(
    '題號,題幹,選項A,選項B,答案,解析,主題\n1,第一題,甲,乙,B,說明,細胞\n2,第二題,丙,,A,,遺傳',
  )

  it('builds question objects from the mapped columns', () => {
    if (!table) throw new Error('table missing')
    const result = buildCsvQuestions(table, guessCsvMapping(table))

    expect(result.error).toBeNull()
    expect(result.questions).toEqual([
      {
        question_number: '1',
        topic: '細胞',
        question: '第一題',
        options: [
          { key: 'A', text: '甲' },
          { key: 'B', text: '乙' },
        ],
        correct_answers: 'B',
        explanation: '說明',
      },
      {
        question_number: '2',
        topic: '遺傳',
        question: '第二題',
        options: [{ key: 'A', text: '丙' }],
        correct_answers: 'A',
        explanation: undefined,
      },
    ])
  })

  it('reports missing mapping and too few options', () => {
    if (!table) throw new Error('table missing')
    const mapping = guessCsvMapping(table)

    expect(
      buildCsvQuestions(table, { ...mapping, question: null }),
    ).toEqual({ questions: [], error: '請選擇題幹與答案欄位。' })
    expect(
      buildCsvQuestions(table, { ...mapping, options: [2] }),
    ).toEqual({ questions: [], error: '請至少選擇 2 個選項欄位。' })
  })

  it('reports an empty data set', () => {
    const headerOnly = parseCsv('題幹,選項A,選項B,答案')
    if (!headerOnly) throw new Error('table missing')

    expect(
      buildCsvQuestions(headerOnly, guessCsvMapping(headerOnly)),
    ).toEqual({ questions: [], error: 'CSV 沒有可匯入的資料列。' })
  })
})
