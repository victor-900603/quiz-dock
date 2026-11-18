import { describe, expect, it } from 'vitest'
import { formatQuestionForCopy, formatQuestionNumber } from './questionText'
import type { Question } from '../types/quiz'

const question: Question = {
  id: 'q-1',
  number: 7,
  topic: '遺傳學',
  prompt: 'DNA 的鹼基配對中，腺嘌呤會與哪一個鹼基配對？',
  options: [
    { key: 'A', text: '胸腺嘧啶' },
    { key: 'B', text: '鳥嘌呤' },
  ],
  correctAnswers: ['A'],
  explanation: '腺嘌呤與胸腺嘧啶配對。',
}

describe('formatQuestionNumber', () => {
  it('pads the number to three digits', () => {
    expect(formatQuestionNumber(7)).toBe('#007')
    expect(formatQuestionNumber(120)).toBe('#120')
  })
})

describe('formatQuestionForCopy', () => {
  it('includes the number, topic, prompt, and every option', () => {
    expect(formatQuestionForCopy(question)).toBe(
      '#007 遺傳學\nDNA 的鹼基配對中，腺嘌呤會與哪一個鹼基配對？\n\nA. 胸腺嘧啶\nB. 鳥嘌呤',
    )
  })

  it('omits an empty topic', () => {
    expect(formatQuestionForCopy({ ...question, topic: '' })).toBe(
      '#007\nDNA 的鹼基配對中，腺嘌呤會與哪一個鹼基配對？\n\nA. 胸腺嘧啶\nB. 鳥嘌呤',
    )
  })
})
