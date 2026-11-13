import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SetStatsDetail, StatsOverview } from '../../types/quiz'
import { statsKeys, useSetStatsQuery, useStatsOverviewQuery } from './queries'
import { fetchSetStats, fetchStatsOverview } from './statsService'

vi.mock('./statsService', () => ({
  fetchStatsOverview: vi.fn(),
  fetchSetStats: vi.fn(),
}))

const emptyOverview: StatsOverview = {
  totalAnswered: 0,
  totalCorrect: 0,
  practicedSets: 0,
  weeklyAnswered: 0,
  setStats: [],
  topicStats: [],
  recentSessions: [],
  dailyActivity: [],
}

const setStats: SetStatsDetail = {
  set: {
    setId: 'set-1',
    title: '題庫一',
    answered: 2,
    correct: 1,
    accuracy: 50,
    lastAnsweredAt: '2026-11-13T15:30:00.000Z',
  },
  topics: [{ name: '主題一', answered: 2, correct: 1 }],
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

describe('stats queries', () => {
  beforeEach(() => {
    vi.mocked(fetchStatsOverview).mockReset()
    vi.mocked(fetchSetStats).mockReset()
  })

  it('builds stable query keys', () => {
    expect(statsKeys.overview()).toEqual(['stats', 'overview'])
    expect(statsKeys.set('set-1')).toEqual(['stats', 'set', 'set-1'])
  })

  it('loads the stats overview', async () => {
    vi.mocked(fetchStatsOverview).mockResolvedValue(emptyOverview)

    const { result } = renderHook(() => useStatsOverviewQuery(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(emptyOverview)
    expect(fetchStatsOverview).toHaveBeenCalledTimes(1)
  })

  it('loads set stats only when a set id is provided', async () => {
    vi.mocked(fetchSetStats).mockResolvedValue(setStats)

    const { result } = renderHook(() => useSetStatsQuery('set-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(setStats)
    expect(fetchSetStats).toHaveBeenCalledWith('set-1')

    const disabled = renderHook(() => useSetStatsQuery(undefined), {
      wrapper: createWrapper(),
    })

    expect(disabled.result.current.fetchStatus).toBe('idle')
    expect(fetchSetStats).toHaveBeenCalledTimes(1)
  })
})
