import { act } from 'react'
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ReactNode } from 'react'
import { MockStoreProvider, useMockStore } from './mockStore'
import type { QuizSet } from '../types/quiz'

function wrapper({ children }: { children: ReactNode }) {
  return <MockStoreProvider>{children}</MockStoreProvider>
}

function makeSet(id: string, title: string): QuizSet {
  return {
    id,
    title,
    description: '測試題庫',
    questionCount: 10,
    topicCount: 1,
    accuracy: null,
    answeredCount: 0,
    lastPracticedLabel: null,
    markedCount: 0,
    topics: [{ name: '測試', answered: 0, correct: 0 }],
  }
}

describe('MockStoreProvider', () => {
  it('starts with a demo user and sample sets', () => {
    const { result } = renderHook(() => useMockStore(), { wrapper })

    expect(result.current.user?.email).toBe('victor@example.com')
    expect(result.current.sets).toHaveLength(4)
  })

  it('logs in and out', () => {
    const { result } = renderHook(() => useMockStore(), { wrapper })

    act(() => result.current.login('new@example.com'))
    expect(result.current.user?.email).toBe('new@example.com')

    act(() => result.current.logout())
    expect(result.current.user).toBeNull()
  })

  it('adds, renames, and removes sets', () => {
    const { result } = renderHook(() => useMockStore(), { wrapper })

    act(() => result.current.addSet(makeSet('new-set', '新題庫')))
    expect(result.current.sets[0].title).toBe('新題庫')

    act(() => result.current.renameSet('biology', '生物學進階'))
    expect(result.current.sets.find((set) => set.id === 'biology')?.title).toBe('生物學進階')

    act(() => result.current.removeSet('biology'))
    expect(result.current.sets.some((set) => set.id === 'biology')).toBe(false)
    expect(result.current.sets).toHaveLength(4)
  })
})
