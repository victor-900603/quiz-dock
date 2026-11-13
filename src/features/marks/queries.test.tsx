import { act, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TestAuthProvider } from '../../test/TestAuthProvider'
import type { MarkedQuestion, Question } from '../../types/quiz'
import { addMark, removeMark } from './marksService'
import { marksKeys, useToggleMarkMutation, type ToggleMarkInput } from './queries'

vi.mock('./marksService', () => ({
  fetchMarks: vi.fn(),
  addMark: vi.fn(),
  removeMark: vi.fn(),
}))

const question: Question = {
  id: 'q-1',
  number: 1,
  topic: '主題',
  prompt: '題目內容',
  options: [
    { key: 'A', text: '選項甲' },
    { key: 'B', text: '選項乙' },
  ],
  correctAnswers: ['A'],
  explanation: '解析內容',
}

const existingMark: MarkedQuestion = {
  ...question,
  setId: 'set-1',
  setTitle: '題庫一',
  markedAt: '2026-01-01T00:00:00.000Z',
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, resolve, reject }
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <TestAuthProvider>{children}</TestAuthProvider>
      </QueryClientProvider>
    )
  }
}

function createQueryClient(marks: MarkedQuestion[]) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  queryClient.setQueryData<MarkedQuestion[]>(marksKeys.all, marks)
  return queryClient
}

const addInput: ToggleMarkInput = {
  questionId: 'q-2',
  marked: false,
  question: { ...question, id: 'q-2', number: 2 },
  setId: 'set-1',
  setTitle: '題庫一',
}

const removeInput: ToggleMarkInput = {
  questionId: 'q-1',
  marked: true,
  question,
  setId: 'set-1',
  setTitle: '題庫一',
}

describe('useToggleMarkMutation', () => {
  beforeEach(() => {
    vi.mocked(addMark).mockReset()
    vi.mocked(removeMark).mockReset()
  })

  it('adds a mark optimistically and rolls back on error', async () => {
    const queryClient = createQueryClient([existingMark])
    const pending = deferred<void>()
    vi.mocked(addMark).mockReturnValue(pending.promise)
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useToggleMarkMutation(), {
      wrapper: createWrapper(queryClient),
    })

    let mutationPromise!: Promise<unknown>
    act(() => {
      mutationPromise = result.current.mutateAsync(addInput).catch(() => undefined)
    })

    await waitFor(() => {
      expect(queryClient.getQueryData<MarkedQuestion[]>(marksKeys.all)).toHaveLength(2)
    })
    expect(queryClient.getQueryData<MarkedQuestion[]>(marksKeys.all)?.[0]).toMatchObject({
      id: 'q-2',
      setId: 'set-1',
      setTitle: '題庫一',
    })

    pending.reject(new Error('boom'))
    await mutationPromise

    await waitFor(() => {
      expect(queryClient.getQueryData<MarkedQuestion[]>(marksKeys.all)).toEqual([
        existingMark,
      ])
    })
    expect(addMark).toHaveBeenCalledWith('q-2', 'test-user')
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: marksKeys.all })
  })

  it('removes a mark optimistically and rolls back on error', async () => {
    const queryClient = createQueryClient([existingMark])
    const pending = deferred<void>()
    vi.mocked(removeMark).mockReturnValue(pending.promise)
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useToggleMarkMutation(), {
      wrapper: createWrapper(queryClient),
    })

    let mutationPromise!: Promise<unknown>
    act(() => {
      mutationPromise = result.current.mutateAsync(removeInput).catch(() => undefined)
    })

    await waitFor(() => {
      expect(queryClient.getQueryData<MarkedQuestion[]>(marksKeys.all)).toHaveLength(0)
    })

    pending.reject(new Error('boom'))
    await mutationPromise

    await waitFor(() => {
      expect(queryClient.getQueryData<MarkedQuestion[]>(marksKeys.all)).toEqual([
        existingMark,
      ])
    })
    expect(removeMark).toHaveBeenCalledWith('q-1', 'test-user')
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: marksKeys.all })
  })

  it('keeps the optimistic mark after a successful request', async () => {
    const queryClient = createQueryClient([existingMark])
    vi.mocked(addMark).mockResolvedValue(undefined)

    const { result } = renderHook(() => useToggleMarkMutation(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync(addInput)
    })

    expect(queryClient.getQueryData<MarkedQuestion[]>(marksKeys.all)).toHaveLength(2)
    expect(result.current.isError).toBe(false)
  })
})
