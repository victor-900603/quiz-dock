import { describe, expect, it } from 'vitest'
import {
  findFirstUnanswered,
  findNextUnanswered,
  hydrateAnswers,
  resolveStartIndex,
  summarizeAnswers,
  summarizeAttempts,
  type AnswerState,
} from './session'
import type { PracticeAttempt, Question } from '../../types/quiz'

const questions: Question[] = [
  {
    id: 'q-1',
    number: 1,
    topic: '細胞結構',
    prompt: '題目一',
    options: [],
    correctAnswers: ['A'],
    explanation: '',
  },
  {
    id: 'q-2',
    number: 2,
    topic: '細胞結構',
    prompt: '題目二',
    options: [],
    correctAnswers: ['B'],
    explanation: '',
  },
  {
    id: 'q-3',
    number: 3,
    topic: '遺傳學',
    prompt: '題目三',
    options: [],
    correctAnswers: ['C'],
    explanation: '',
  },
]

function answer(selected: string[], correct: boolean): AnswerState {
  return { selected, submitted: true, correct }
}

describe('hydrateAnswers', () => {
  it('turns prior attempts into submitted answer states', () => {
    const answers = hydrateAnswers([
      { questionId: 'q-1', selected: ['A'], correct: true },
      { questionId: 'q-2', selected: ['A'], correct: false },
    ])

    expect(answers['q-1']).toEqual({ selected: ['A'], submitted: true, correct: true })
    expect(answers['q-2']).toEqual({ selected: ['A'], submitted: true, correct: false })
  })

  it('returns an empty record when there are no attempts', () => {
    expect(hydrateAnswers()).toEqual({})
  })
})

describe('summarizeAnswers', () => {
  it('counts answered questions, correct answers, and topic totals', () => {
    const progress = summarizeAnswers(questions, {
      'q-1': answer(['A'], true),
      'q-2': answer(['A'], false),
    })

    expect(progress.answered).toBe(2)
    expect(progress.correct).toBe(1)
    expect(progress.topics).toEqual([{ name: '細胞結構', answered: 2, correct: 1 }])
  })

  it('ignores questions that have not been submitted', () => {
    const progress = summarizeAnswers(questions, {
      'q-1': { selected: ['A'], submitted: false, correct: false },
      'q-3': answer(['C'], true),
    })

    expect(progress.answered).toBe(1)
    expect(progress.correct).toBe(1)
    expect(progress.topics).toEqual([{ name: '遺傳學', answered: 1, correct: 1 }])
  })
})

describe('findFirstUnanswered', () => {
  it('returns the first question without a submitted answer', () => {
    expect(findFirstUnanswered(questions, { 'q-1': answer(['A'], true) })).toBe(1)
    expect(findFirstUnanswered(questions, {})).toBe(0)
  })

  it('falls back to the last question when everything is answered', () => {
    expect(
      findFirstUnanswered(questions, {
        'q-1': answer(['A'], true),
        'q-2': answer(['B'], true),
        'q-3': answer(['C'], true),
      }),
    ).toBe(2)
  })
})

function attempt(
  questionId: string,
  isCorrect: boolean,
  durationMs: number | null,
): PracticeAttempt {
  return {
    questionId,
    selected: ['A'],
    isCorrect,
    durationMs,
    answeredAt: '2026-11-13T00:00:00.000Z',
    updatedAt: '2026-11-13T00:00:00.000Z',
  }
}

describe('summarizeAttempts', () => {
  it('counts attempts, correct answers, duration, and topics', () => {
    const summary = summarizeAttempts(questions, [
      attempt('q-1', true, 1000),
      attempt('q-3', false, 2500),
    ])

    expect(summary.answered).toBe(2)
    expect(summary.correct).toBe(1)
    expect(summary.durationSeconds).toBe(3.5)
    expect(summary.topics).toEqual([
      { name: '細胞結構', answered: 1, correct: 1 },
      { name: '遺傳學', answered: 1, correct: 0 },
    ])
  })

  it('ignores attempts for questions outside the session and missing durations', () => {
    const summary = summarizeAttempts(questions, [
      attempt('q-2', true, null),
      attempt('missing', true, 5000),
    ])

    expect(summary.answered).toBe(1)
    expect(summary.correct).toBe(1)
    expect(summary.durationSeconds).toBe(0)
  })
})

describe('resolveStartIndex', () => {
  it('returns the server index when that question is unanswered', () => {
    expect(resolveStartIndex(questions, { 'q-1': answer(['A'], true) }, 1, false)).toBe(1)
  })

  it('falls back to the first unanswered question when the server index is answered', () => {
    expect(
      resolveStartIndex(
        questions,
        { 'q-1': answer(['A'], true), 'q-2': answer(['B'], true) },
        1,
        false,
      ),
    ).toBe(2)
  })

  it('returns the last question for completed sessions', () => {
    expect(resolveStartIndex(questions, {}, 3, true)).toBe(2)
  })

  it('clamps out-of-range indexes and handles empty sessions', () => {
    expect(resolveStartIndex(questions, {}, 9, false)).toBe(2)
    expect(resolveStartIndex([], {}, 0, false)).toBe(0)
  })
})

describe('findNextUnanswered', () => {
  it('finds the next unanswered question and wraps around', () => {
    expect(findNextUnanswered(questions, { 'q-1': answer(['A'], true) }, 0)).toBe(1)
    expect(findNextUnanswered(questions, { 'q-1': answer(['A'], true) }, 2)).toBe(1)
  })

  it('returns minus one when every question is answered', () => {
    expect(
      findNextUnanswered(questions, {
        'q-1': answer(['A'], true),
        'q-2': answer(['B'], true),
        'q-3': answer(['C'], true),
      }, 0),
    ).toBe(-1)
  })
})
