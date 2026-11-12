export type QuizOption = {
  key: string
  text: string
}

export type Question = {
  id: string
  number: number
  topic: string
  prompt: string
  options: QuizOption[]
  correctAnswers: string[]
  explanation: string
}

export type TopicStat = {
  name: string
  answered: number
  correct: number
}

export type PracticeMode = 'sequential' | 'random'

export type SessionAttempt = {
  questionId: string
  selected: string[]
  correct: boolean
}

export type ActiveSession = {
  id: string
  answered: number
  correct: number
  total: number
  mode: PracticeMode
  attempts?: SessionAttempt[]
}

export type QuizSet = {
  id: string
  title: string
  description: string
  questionCount: number
  topicCount: number
  accuracy: number | null
  answeredCount: number
  lastPracticedLabel: string | null
  markedCount: number
  topics: TopicStat[]
  activeSession?: ActiveSession
}

export type MarkedQuestion = Question & {
  setId: string
  setTitle: string
  markedAt: string
}

export type SessionSummary = {
  setId: string
  setTitle: string
  mode: PracticeMode
  answered: number
  correct: number
  durationSeconds: number
  topics: TopicStat[]
}
