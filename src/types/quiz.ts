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
  total?: number
  answered: number
  correct: number
}

export type PracticeMode = 'sequential' | 'random'

export type PracticeStatus = 'in_progress' | 'completed' | 'abandoned'

export type PracticeSession = {
  id: string
  setId: string
  mode: PracticeMode
  status: PracticeStatus
  questionOrder: string[]
  currentIndex: number
  totalQuestions: number
  answeredCount: number
  correctCount: number
  startedAt: string
  completedAt: string | null
  updatedAt: string
}

export type PracticeAttempt = {
  questionId: string
  selected: string[]
  isCorrect: boolean
  durationMs: number | null
  answeredAt: string
  updatedAt: string
}

export type PracticeProgress = {
  id: string
  setId: string
  mode: PracticeMode
  status: PracticeStatus
  answered: number
  correct: number
  total: number
  updatedAt: string
}

export type PracticeSessionDetail = {
  session: PracticeSession
  set: QuizSet
  questions: Question[]
  attempts: PracticeAttempt[]
}

export type SubmitAnswerResult = {
  isCorrect: boolean
  correctAnswers: string[]
  explanation: string
  alreadyAnswered: boolean
  wasUpdated: boolean
  sessionStatus: PracticeStatus
  currentIndex: number
  answeredCount: number
  correctCount: number
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
}

export type MarkedQuestion = Question & {
  setId: string
  setTitle: string
  markedAt: string
}

export type SetStat = {
  setId: string
  title: string
  answered: number
  correct: number
  accuracy: number | null
  lastAnsweredAt: string | null
}

export type SessionSummary = {
  id: string
  setId: string
  setTitle: string
  mode: PracticeMode
  status: PracticeStatus
  total: number
  answered: number
  correct: number
  accuracy: number | null
  startedAt: string
  updatedAt: string
  completedAt: string | null
}

export type DailyActivity = {
  day: string
  label: string
  answered: number
  correct: number
}

export type StatsOverview = {
  totalAnswered: number
  totalCorrect: number
  practicedSets: number
  weeklyAnswered: number
  setStats: SetStat[]
  topicStats: TopicStat[]
  recentSessions: SessionSummary[]
  dailyActivity: DailyActivity[]
}

export type SetStatsDetail = {
  set: SetStat
  topics: TopicStat[]
}
