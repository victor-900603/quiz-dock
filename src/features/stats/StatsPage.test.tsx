import { act, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StatsOverview } from '../../types/quiz'
import { StatsPage } from './StatsPage'
import { fetchStatsOverview } from './statsService'

vi.mock('./statsService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./statsService')>()
  return {
    ...actual,
    fetchStatsOverview: vi.fn(),
  }
})

const sampleStats: StatsOverview = {
  totalAnswered: 10,
  totalCorrect: 8,
  practicedSets: 2,
  weeklyAnswered: 6,
  setStats: [
    {
      setId: 'set-1',
      title: '題庫一',
      answered: 6,
      correct: 5,
      accuracy: 83.3,
      lastAnsweredAt: '2026-11-13T15:30:00.000Z',
    },
    {
      setId: 'set-2',
      title: '題庫二',
      answered: 4,
      correct: 3,
      accuracy: 75,
      lastAnsweredAt: '2026-11-12T15:30:00.000Z',
    },
  ],
  topicStats: [
    { name: '主題一', answered: 6, correct: 5 },
    { name: '主題二', answered: 4, correct: 3 },
  ],
  recentSessions: [
    {
      id: 'session-1',
      setId: 'set-1',
      setTitle: '題庫一',
      mode: 'sequential',
      status: 'completed',
      total: 10,
      answered: 10,
      correct: 8,
      accuracy: 80,
      startedAt: '2026-11-13T15:00:00.000Z',
      updatedAt: '2026-11-13T15:30:00.000Z',
      completedAt: '2026-11-13T15:30:00.000Z',
    },
  ],
  dailyActivity: [
    { day: '2026-10-31', label: '10/31', answered: 0, correct: 0 },
    { day: '2026-11-01', label: '11/01', answered: 0, correct: 0 },
    { day: '2026-11-02', label: '11/02', answered: 0, correct: 0 },
    { day: '2026-11-03', label: '11/03', answered: 0, correct: 0 },
    { day: '2026-11-04', label: '11/04', answered: 0, correct: 0 },
    { day: '2026-11-05', label: '11/05', answered: 0, correct: 0 },
    { day: '2026-11-06', label: '11/06', answered: 0, correct: 0 },
    { day: '2026-11-07', label: '11/07', answered: 0, correct: 0 },
    { day: '2026-11-08', label: '11/08', answered: 0, correct: 0 },
    { day: '2026-11-09', label: '11/09', answered: 0, correct: 0 },
    { day: '2026-11-10', label: '11/10', answered: 0, correct: 0 },
    { day: '2026-11-11', label: '11/11', answered: 0, correct: 0 },
    { day: '2026-11-12', label: '11/12', answered: 2, correct: 1 },
    { day: '2026-11-13', label: '11/13', answered: 4, correct: 3 },
  ],
}

const emptyStats: StatsOverview = {
  totalAnswered: 0,
  totalCorrect: 0,
  practicedSets: 0,
  weeklyAnswered: 0,
  setStats: [],
  topicStats: [],
  recentSessions: [],
  dailyActivity: sampleStats.dailyActivity.map((item) => ({
    ...item,
    answered: 0,
    correct: 0,
  })),
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

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function renderStats() {
  return render(<StatsPage />, { wrapper: createWrapper() })
}

describe('StatsPage', () => {
  beforeEach(() => {
    vi.mocked(fetchStatsOverview).mockReset()
  })

  it('shows a skeleton while loading and then the aggregated numbers', async () => {
    const pending = deferred<StatsOverview>()
    vi.mocked(fetchStatsOverview).mockReturnValue(pending.promise)

    renderStats()

    expect(screen.getByRole('status')).toHaveTextContent('載入統計中...')

    await act(async () => {
      pending.resolve(sampleStats)
    })

    expect(await screen.findByText('答對 8 題')).toBeInTheDocument()
    expect(screen.getByText('5 / 6 題')).toBeInTheDocument()
    expect(screen.getAllByText('83.3%').length).toBeGreaterThan(0)
    expect(screen.getByText('主題一')).toBeInTheDocument()
    expect(screen.getByText('8 / 10')).toBeInTheDocument()
    expect(screen.getByTitle('11/13：4 題')).toBeInTheDocument()
  })

  it('shows an empty state when there are no attempts', async () => {
    vi.mocked(fetchStatsOverview).mockResolvedValue(emptyStats)

    renderStats()

    expect(
      await screen.findByText('完成第一場練習後，這裡會顯示統計。'),
    ).toBeInTheDocument()
  })

  it('shows an error and retries the query', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchStatsOverview)
      .mockRejectedValueOnce(new Error('無法載入統計，請稍後再試。'))
      .mockResolvedValueOnce(sampleStats)

    renderStats()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '無法載入統計，請稍後再試。',
    )

    await user.click(screen.getByRole('button', { name: '重新載入' }))

    expect(await screen.findByText('答對 8 題')).toBeInTheDocument()
  })
})
