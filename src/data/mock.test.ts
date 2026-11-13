import { describe, expect, it } from 'vitest'
import { mockQuestionsBySet, mockSets } from './mock'

describe('mock data', () => {
  it('keeps set metadata and questions consistent', () => {
    const questionIds = new Set<string>()

    for (const set of mockSets) {
      const questions = mockQuestionsBySet[set.id] ?? []

      expect(questions).toHaveLength(set.questionCount)
      expect(new Set(questions.map((item) => item.topic)).size).toBe(set.topicCount)

      questions.forEach((item, index) => {
        expect(item.number).toBe(index + 1)
        expect(questionIds.has(item.id)).toBe(false)
        questionIds.add(item.id)

        const optionKeys = item.options.map((option) => option.key)
        expect(optionKeys.length).toBeGreaterThanOrEqual(2)
        for (const answer of item.correctAnswers) {
          expect(optionKeys).toContain(answer)
        }
      })
    }

    expect(questionIds.size).toBe(76)
  })
})
