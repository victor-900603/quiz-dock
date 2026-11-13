import type { PracticeAttempt, Question, TopicStat } from '../../types/quiz'

export type AnswerState = {
  selected: string[]
  submitted: boolean
  correct: boolean
  correctAnswers?: string[]
  explanation?: string
}

export type AttemptAnswer = {
  questionId: string
  selected: string[]
  correct: boolean
}

export type SessionProgress = {
  answered: number
  correct: number
  topics: TopicStat[]
}

export type AttemptSummary = SessionProgress & {
  durationSeconds: number
}

export function hydrateAnswers(attempts: AttemptAnswer[] = []): Record<string, AnswerState> {
  return Object.fromEntries(
    attempts.map((attempt) => [
      attempt.questionId,
      {
        selected: attempt.selected,
        submitted: true,
        correct: attempt.correct,
      },
    ]),
  )
}

export function summarizeAnswers(
  questions: Question[],
  answers: Record<string, AnswerState>,
): SessionProgress {
  const topics = new Map<string, TopicStat>()
  let answered = 0
  let correct = 0

  for (const question of questions) {
    const answer = answers[question.id]
    if (!answer?.submitted) continue

    answered += 1
    if (answer.correct) correct += 1

    const topic = topics.get(question.topic) ?? {
      name: question.topic,
      answered: 0,
      correct: 0,
    }
    topic.answered += 1
    if (answer.correct) topic.correct += 1
    topics.set(question.topic, topic)
  }

  return { answered, correct, topics: [...topics.values()] }
}

export function summarizeAttempts(
  questions: Question[],
  attempts: PracticeAttempt[],
): AttemptSummary {
  const attemptByQuestion = new Map(
    attempts.map((attempt) => [attempt.questionId, attempt]),
  )
  const topics = new Map<string, TopicStat>()
  let answered = 0
  let correct = 0
  let durationMs = 0

  for (const question of questions) {
    const attempt = attemptByQuestion.get(question.id)
    if (!attempt) continue

    answered += 1
    if (attempt.isCorrect) correct += 1
    durationMs += attempt.durationMs ?? 0

    const topic = topics.get(question.topic) ?? {
      name: question.topic,
      answered: 0,
      correct: 0,
    }
    topic.answered += 1
    if (attempt.isCorrect) topic.correct += 1
    topics.set(question.topic, topic)
  }

  return {
    answered,
    correct,
    durationSeconds: durationMs / 1000,
    topics: [...topics.values()],
  }
}

export function findFirstUnanswered(
  questions: Question[],
  answers: Record<string, AnswerState>,
): number {
  const index = questions.findIndex((question) => !answers[question.id]?.submitted)
  return index === -1 ? Math.max(questions.length - 1, 0) : index
}

export function findNextUnanswered(
  questions: Question[],
  answers: Record<string, AnswerState>,
  fromIndex: number,
): number {
  for (let step = 1; step <= questions.length; step += 1) {
    const candidate = (fromIndex + step) % questions.length
    if (!answers[questions[candidate].id]?.submitted) return candidate
  }

  return -1
}

export function resolveStartIndex(
  questions: Question[],
  answers: Record<string, AnswerState>,
  currentIndex: number,
  completed: boolean,
): number {
  if (questions.length === 0) return 0
  if (completed) return questions.length - 1

  const candidate = Math.min(Math.max(currentIndex, 0), questions.length - 1)
  if (answers[questions[candidate].id]?.submitted) {
    return findFirstUnanswered(questions, answers)
  }

  return candidate
}
