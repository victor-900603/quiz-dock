import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { mockSets } from '../data/mock'
import type { QuizSet } from '../types/quiz'

type User = {
  email: string
}

type MockStoreValue = {
  user: User | null
  sets: QuizSet[]
  login: (email: string) => void
  logout: () => void
  addSet: (set: QuizSet) => void
  renameSet: (setId: string, title: string) => void
  removeSet: (setId: string) => void
}

const MockStoreContext = createContext<MockStoreValue | null>(null)

export function MockStoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>({ email: 'victor@example.com' })
  const [sets, setSets] = useState<QuizSet[]>(mockSets)

  const value = useMemo<MockStoreValue>(
    () => ({
      user,
      sets,
      login: (email) => setUser({ email }),
      logout: () => setUser(null),
      addSet: (set) => setSets((current) => [set, ...current]),
      renameSet: (setId, title) => {
        setSets((current) => current.map((set) => (set.id === setId ? { ...set, title } : set)))
      },
      removeSet: (setId) => {
        setSets((current) => current.filter((set) => set.id !== setId))
      },
    }),
    [sets, user],
  )

  return <MockStoreContext.Provider value={value}>{children}</MockStoreContext.Provider>
}

export function useMockStore() {
  const value = useContext(MockStoreContext)
  if (!value) throw new Error('useMockStore must be used within MockStoreProvider')
  return value
}
