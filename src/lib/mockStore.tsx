import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { mockMarks, mockQuestionContext, mockSets } from '../data/mock'
import type { ActiveSession, MarkedQuestion, PracticeMode, QuizSet } from '../types/quiz'

type User = {
  email: string
}

type MockStoreValue = {
  user: User | null
  sets: QuizSet[]
  marks: MarkedQuestion[]
  login: (email: string) => void
  logout: () => void
  addSet: (set: QuizSet) => void
  renameSet: (setId: string, title: string) => void
  removeSet: (setId: string) => void
  savePractice: (setId: string, session: ActiveSession) => void
  resetPractice: (setId: string, mode: PracticeMode) => void
  toggleMark: (questionId: string) => void
  isMarked: (questionId: string) => boolean
}

const MockStoreContext = createContext<MockStoreValue | null>(null)

export function MockStoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>({ email: 'victor@example.com' })
  const [sets, setSets] = useState<QuizSet[]>(mockSets)
  const [marks, setMarks] = useState<MarkedQuestion[]>(mockMarks)

  const value = useMemo<MockStoreValue>(
    () => ({
      user,
      sets,
      marks,
      login: (email) => setUser({ email }),
      logout: () => setUser(null),
      addSet: (set) => setSets((current) => [set, ...current]),
      renameSet: (setId, title) => {
        setSets((current) => current.map((set) => (set.id === setId ? { ...set, title } : set)))
        setMarks((current) =>
          current.map((mark) => (mark.setId === setId ? { ...mark, setTitle: title } : mark)),
        )
      },
      removeSet: (setId) => {
        setSets((current) => current.filter((set) => set.id !== setId))
        setMarks((current) => current.filter((mark) => mark.setId !== setId))
      },
      savePractice: (setId, session) => {
        setSets((current) =>
          current.map((set) =>
            set.id === setId
              ? {
                  ...set,
                  answeredCount: session.answered,
                  accuracy: session.answered > 0 ? (session.correct / session.answered) * 100 : null,
                  lastPracticedLabel: '剛剛',
                  activeSession: session,
                }
              : set,
          ),
        )
      },
      resetPractice: (setId, mode) => {
        setSets((current) =>
          current.map((set) =>
            set.id === setId
              ? {
                  ...set,
                  answeredCount: 0,
                  accuracy: null,
                  lastPracticedLabel: null,
                  activeSession: {
                    id: `session-${setId}`,
                    answered: 0,
                    correct: 0,
                    total: set.questionCount,
                    mode,
                    attempts: [],
                  },
                }
              : set,
          ),
        )
      },
      toggleMark: (questionId) => {
        setMarks((current) => {
          if (current.some((mark) => mark.id === questionId)) {
            return current.filter((mark) => mark.id !== questionId)
          }

          const context = mockQuestionContext.get(questionId)
          if (!context) return current

          return [
            {
              ...context.question,
              setId: context.set.id,
              setTitle: context.set.title,
              markedAt: '剛剛',
            },
            ...current,
          ]
        })
      },
      isMarked: (questionId) => marks.some((mark) => mark.id === questionId),
    }),
    [marks, sets, user],
  )

  return <MockStoreContext.Provider value={value}>{children}</MockStoreContext.Provider>
}

export function useMockStore() {
  const value = useContext(MockStoreContext)
  if (!value) throw new Error('useMockStore must be used within MockStoreProvider')
  return value
}
