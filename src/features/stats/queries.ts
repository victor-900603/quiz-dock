import { useQuery } from '@tanstack/react-query'
import type { SetStatsDetail, StatsOverview } from '../../types/quiz'
import { fetchSetStats, fetchStatsOverview } from './statsService'

export const statsKeys = {
  all: ['stats'] as const,
  overview: () => [...statsKeys.all, 'overview'] as const,
  set: (setId: string) => [...statsKeys.all, 'set', setId] as const,
}

export function useStatsOverviewQuery() {
  return useQuery<StatsOverview>({
    queryKey: statsKeys.overview(),
    queryFn: () => fetchStatsOverview(),
  })
}

export function useSetStatsQuery(setId: string | undefined) {
  return useQuery<SetStatsDetail | null>({
    queryKey: statsKeys.set(setId ?? ''),
    queryFn: () => fetchSetStats(setId as string),
    enabled: Boolean(setId),
  })
}
