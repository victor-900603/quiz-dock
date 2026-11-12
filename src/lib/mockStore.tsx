import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { mockMarks, mockQuestionContext, mockSets } from '../data/mock'
import type { MarkedQuestion, QuizSet } from '../types/quiz'

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
