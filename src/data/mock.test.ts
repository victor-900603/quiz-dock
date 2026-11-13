import { describe, expect, it } from 'vitest'
import { mockQuestionsBySet, mockSets } from './mock'

describe('mock data', () => {
  it('keeps set metadata and questions consistent', () => {
    const questionIds = new Set<string>()
    const setIds = new Set<string>()

    for (const set of mockSets) {
      const questions = mockQuestionsBySet[set.id] ?? []

      expect(setIds.has(set.id)).toBe(false)
      setIds.add(set.id)
      expect(questions).toHaveLength(set.questionCount)
      expect(new Set(questions.map((item) => item.topic)).size).toBe(set.topicCount)
      expect(set.accuracy).toBeNull()
      expect(set.answeredCount).toBe(0)
      expect(set.lastPracticedLabel).toBeNull()
      expect(set.markedCount).toBe(0)
      expect(set.topics.every((topic) => topic.answered === 0 && topic.correct === 0)).toBe(
        true,
      )

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
