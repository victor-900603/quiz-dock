import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PracticeSessionDetail } from '../../types/quiz'
import { resetReadingSize } from '../settings/readingScale'
import { PracticePage } from './PracticePage'

const mocks = vi.hoisted(() => ({
  sessionQuery: {
    isPending: false,
    isError: false,
    error: null as Error | null,
    data: null as PracticeSessionDetail | null,
    refetch: vi.fn(),
  },
  submit: {
    mutateAsync: vi.fn(),
    isPending: false,
  },
  marks: {
    data: [] as { id: string }[],
    isError: false,
  },
  toggleMark: {
    mutate: vi.fn(),
    isError: false,
  },
  preferences: {
    preferences: { autoMarkWrong: false },
  },
}))

vi.mock('./queries', () => ({
  usePracticeSessionQuery: () => mocks.sessionQuery,
  useSubmitAnswerMutation: () => mocks.submit,
}))

vi.mock('../marks/queries', () => ({
  useMarksQuery: () => mocks.marks,
  useToggleMarkMutation: () => mocks.toggleMark,
}))

vi.mock('../settings/queries', () => ({
  usePreferences: () => mocks.preferences,
}))

function buildDetail(): PracticeSessionDetail {
  return {
    session: {
      id: 'session-1',
      setId: 'set-1',
      mode: 'sequential',
      status: 'in_progress',
      questionOrder: ['q-1', 'q-2'],
      currentIndex: 0,
      totalQuestions: 2,
      answeredCount: 1,
      correctCount: 1,
      sourceSessionId: null,
      startedAt: '2026-11-15T00:00:00.000Z',
      completedAt: null,
      updatedAt: '2026-11-15T00:00:00.000Z',
    },
    set: {
      id: 'set-1',
      title: '生物學基礎',
      description: '',
      questionCount: 2,
      topicCount: 1,
      accuracy: null,
      answeredCount: 1,
      lastPracticedLabel: null,
      markedCount: 0,
      topics: [],
    },
    questions: [
      {
        id: 'q-1',
        number: 1,
        topic: '細胞結構',
        prompt: '題目一',
        options: [
          { key: 'A', text: '甲' },
          { key: 'B', text: '乙' },
        ],
        correctAnswers: ['A'],
        explanation: '解析一',
      },
      {
        id: 'q-2',
        number: 2,
        topic: '細胞結構',
        prompt: '題目二',
        options: [
          { key: 'A', text: '甲' },
          { key: 'B', text: '乙' },
        ],
        correctAnswers: ['B'],
        explanation: '解析二',
      },
    ],
    attempts: [],
  }
}

function renderPractice() {
  const queryClient = new QueryClient()

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/practice/session-1?setId=set-1']}>
        <Routes>
          <Route path="/practice/:sessionId" element={<PracticePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PracticePage', () => {
  beforeEach(() => {
    mocks.sessionQuery.isPending = false
    mocks.sessionQuery.isError = false
    mocks.sessionQuery.error = null
    mocks.sessionQuery.data = buildDetail()
    mocks.submit.isPending = false
    mocks.submit.mutateAsync.mockReset()
    mocks.marks.data = []
    mocks.marks.isError = false
    mocks.toggleMark.isError = false
    mocks.toggleMark.mutate.mockReset()
    mocks.preferences.preferences = { autoMarkWrong: false }
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    resetReadingSize()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    resetReadingSize()
  })

  it('renders the current question and the practice header', () => {
    renderPractice()

    expect(screen.getByText('題目一')).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(within(screen.getByRole('banner')).getByText(/第 1 \/ 2 題/)).toBeInTheDocument()
  })

  it('returns to the top when moving to another question', async () => {
    const user = userEvent.setup()
    renderPractice()
    const scrollTo = vi.mocked(window.scrollTo)

    expect(scrollTo).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '切換到下一題' }))

    expect(screen.getByText('題目二')).toBeInTheDocument()
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })

  it('aligns the question card when moving to another question on desktop', async () => {
    const user = userEvent.setup()
    const scrollIntoView = vi.fn()
    HTMLElement.prototype.scrollIntoView = scrollIntoView
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('min-width: 1024px'),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    renderPractice()
    scrollIntoView.mockClear()

    await user.hover(screen.getByRole('button', { name: /練習工具列/ }))
    await user.click(screen.getByRole('button', { name: '後一題' }))

    expect(screen.getByText('題目二')).toBeInTheDocument()
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    })

    delete (HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView
    vi.unstubAllGlobals()
  })

  it('moves between questions with the desktop controls', async () => {
    const user = userEvent.setup()
    renderPractice()
    await user.hover(screen.getByRole('button', { name: /練習工具列/ }))

    expect(screen.getByRole('button', { name: '前一題' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '後一題' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: '後一題' }))

    expect(screen.getByText('題目二')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '前一題' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '後一題' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: '前一題' }))

    expect(screen.getByText('題目一')).toBeInTheDocument()
  })

  it('moves between questions with the arrow keys', async () => {
    const user = userEvent.setup()
    renderPractice()

    await user.keyboard('{ArrowRight}')
    expect(screen.getByText('題目二')).toBeInTheDocument()

    await user.keyboard('{ArrowLeft}')
    expect(screen.getByText('題目一')).toBeInTheDocument()
  })

  it('ignores arrow keys while editing an answer', async () => {
    const user = userEvent.setup()
    mocks.submit.mutateAsync.mockResolvedValue({
      isCorrect: true,
      correctAnswers: ['A'],
      explanation: '解析一',
      alreadyAnswered: false,
      wasUpdated: false,
      sessionStatus: 'in_progress',
      currentIndex: 1,
      answeredCount: 1,
      correctCount: 1,
    })
    renderPractice()

    await user.click(screen.getByRole('radio', { name: /A.*甲/ }))
    await user.click(screen.getByRole('button', { name: '確認答案' }))
    await user.click(await screen.findByRole('button', { name: '修改答案' }))
    await user.keyboard('{ArrowRight}')

    expect(screen.getByText('題目一')).toBeInTheDocument()
  })

  it('ignores answer shortcuts while the reading scale dialog is open', async () => {
    const user = userEvent.setup()
    renderPractice()

    const optionA = screen.getByRole('radio', { name: /A.*甲/ })
    await user.click(optionA)
    expect(optionA).toHaveAttribute('aria-checked', 'true')

    await user.click(screen.getAllByRole('button', { name: '調整字級' })[0])
    expect(screen.getByRole('dialog', { name: '字級' })).toBeInTheDocument()

    await user.keyboard('2')
    expect(screen.getByRole('radio', { name: /A.*甲/ })).toHaveAttribute(
      'aria-checked',
      'true',
    )

    await user.keyboard('{Enter}')
    expect(mocks.submit.mutateAsync).not.toHaveBeenCalled()
  })

  it('marks a wrong answer automatically when the setting is enabled', async () => {
    const user = userEvent.setup()
    mocks.preferences.preferences = { autoMarkWrong: true }
    mocks.submit.mutateAsync.mockResolvedValue({
      isCorrect: false,
      correctAnswers: ['B'],
      explanation: '解析',
      alreadyAnswered: false,
      wasUpdated: false,
      sessionStatus: 'in_progress',
      currentIndex: 1,
      answeredCount: 2,
      correctCount: 1,
    })
    renderPractice()

    await user.click(screen.getByRole('radio', { name: /A.*甲/ }))
    await user.click(screen.getByRole('button', { name: '確認答案' }))

    await waitFor(() => expect(mocks.toggleMark.mutate).toHaveBeenCalledTimes(1))
    expect(mocks.toggleMark.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        questionId: 'q-1',
        marked: false,
        setId: 'set-1',
        setTitle: '生物學基礎',
      }),
      expect.anything(),
    )
  })

  it('does not mark a correct answer', async () => {
    const user = userEvent.setup()
    mocks.preferences.preferences = { autoMarkWrong: true }
    mocks.submit.mutateAsync.mockResolvedValue({
      isCorrect: true,
      correctAnswers: ['A'],
      explanation: '解析',
      alreadyAnswered: false,
      wasUpdated: false,
      sessionStatus: 'in_progress',
      currentIndex: 1,
      answeredCount: 2,
      correctCount: 2,
    })
    renderPractice()

    await user.click(screen.getByRole('radio', { name: /A.*甲/ }))
    await user.click(screen.getByRole('button', { name: '確認答案' }))

    await waitFor(() => expect(mocks.submit.mutateAsync).toHaveBeenCalled())
    expect(mocks.toggleMark.mutate).not.toHaveBeenCalled()
  })

  it('does not mark a wrong answer when the setting is disabled', async () => {
    const user = userEvent.setup()
    mocks.submit.mutateAsync.mockResolvedValue({
      isCorrect: false,
      correctAnswers: ['B'],
      explanation: '解析',
      alreadyAnswered: false,
      wasUpdated: false,
      sessionStatus: 'in_progress',
      currentIndex: 1,
      answeredCount: 2,
      correctCount: 1,
    })
    renderPractice()

    await user.click(screen.getByRole('radio', { name: /A.*甲/ }))
    await user.click(screen.getByRole('button', { name: '確認答案' }))

    await waitFor(() => expect(mocks.submit.mutateAsync).toHaveBeenCalled())
    expect(mocks.toggleMark.mutate).not.toHaveBeenCalled()
  })

  it('does not mark a question that is already marked', async () => {
    const user = userEvent.setup()
    mocks.preferences.preferences = { autoMarkWrong: true }
    mocks.marks.data = [{ id: 'q-1' }]
    mocks.submit.mutateAsync.mockResolvedValue({
      isCorrect: false,
      correctAnswers: ['B'],
      explanation: '解析',
      alreadyAnswered: false,
      wasUpdated: false,
      sessionStatus: 'in_progress',
      currentIndex: 1,
      answeredCount: 2,
      correctCount: 1,
    })
    renderPractice()

    await user.click(screen.getByRole('radio', { name: /A.*甲/ }))
    await user.click(screen.getByRole('button', { name: '確認答案' }))

    await waitFor(() => expect(mocks.submit.mutateAsync).toHaveBeenCalled())
    expect(mocks.toggleMark.mutate).not.toHaveBeenCalled()
  })
})
