import { describe, expect, it } from 'vitest'
import { evaluateAnswer, isMultiAnswer } from './evaluate'

describe('evaluateAnswer', () => {
  it('ignores order and duplicates', () => {
    expect(evaluateAnswer(['D', 'A', 'A'], ['A', 'D'])).toBe(true)
  })

  it('rejects missing or extra answers', () => {
    expect(evaluateAnswer(['A'], ['A', 'B'])).toBe(false)
    expect(evaluateAnswer(['A', 'B', 'C'], ['A', 'B'])).toBe(false)
  })

  it('rejects wrong answers and empty selections', () => {
    expect(evaluateAnswer(['B'], ['A'])).toBe(false)
    expect(evaluateAnswer([], ['A'])).toBe(false)
  })

  it('treats empty correct answers as correct only when nothing is selected', () => {
    expect(evaluateAnswer([], [])).toBe(true)
  })
})

describe('isMultiAnswer', () => {
  it('detects more than one unique correct answer', () => {
    expect(isMultiAnswer(['A'])).toBe(false)
    expect(isMultiAnswer(['A', 'A'])).toBe(false)
    expect(isMultiAnswer(['A', 'B'])).toBe(true)
  })
})
