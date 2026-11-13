import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ImportPayload } from '../../schemas/import'
import { useAuth } from '../auth/AuthContext'
import { importQuizSet, type ImportResult } from './importService'
import {
  deleteQuizSet,
  fetchSetDetail,
  fetchSets,
  renameQuizSet,
  type SetDetail,
} from './libraryService'

export const libraryKeys = {
  all: ['library'] as const,
  sets: () => [...libraryKeys.all, 'sets'] as const,
  set: (setId: string) => [...libraryKeys.all, 'set', setId] as const,
}

export function useSetsQuery() {
  return useQuery({
    queryKey: libraryKeys.sets(),
    queryFn: () => fetchSets(),
  })
}

export function useSetQuery(setId: string | undefined) {
  return useQuery<SetDetail | null>({
    queryKey: libraryKeys.set(setId ?? ''),
    queryFn: () => fetchSetDetail(setId as string),
    enabled: Boolean(setId),
  })
}

export function useRenameSetMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ setId, title }: { setId: string; title: string }) =>
      renameQuizSet(setId, title),
    onSuccess: (_title, { setId }) => {
      queryClient.invalidateQueries({ queryKey: libraryKeys.sets() })
      queryClient.invalidateQueries({ queryKey: libraryKeys.set(setId) })
    },
  })
}

export function useDeleteSetMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (setId: string) => deleteQuizSet(setId),
    onSuccess: (_deletedId, setId) => {
      queryClient.removeQueries({ queryKey: libraryKeys.set(setId) })
      queryClient.invalidateQueries({ queryKey: libraryKeys.sets() })
    },
  })
}

export function useImportSetMutation() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation<ImportResult, Error, ImportPayload>({
    mutationFn: (payload) => {
      if (!user) {
        throw new Error('請先登入再匯入題庫。')
      }

      return importQuizSet(payload, { ownerId: user.id })
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: libraryKeys.sets() })
      queryClient.invalidateQueries({ queryKey: libraryKeys.set(result.id) })
    },
  })
}
