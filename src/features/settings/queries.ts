import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import { preferenceDefaults, type Preferences } from './preferences'
import { fetchPreferences, savePreferences } from './preferencesService'

export const settingsKeys = {
  all: ['settings'] as const,
  preferences: (userId: string | undefined) =>
    ['settings', 'preferences', userId] as const,
}

export function usePreferences() {
  const { user } = useAuth()

  const query = useQuery<Preferences>({
    queryKey: settingsKeys.preferences(user?.id),
    queryFn: () => fetchPreferences(user!.id),
    enabled: Boolean(user),
  })

  return {
    ...query,
    preferences: query.data ?? preferenceDefaults,
  }
}

export function useUpdatePreferences() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const queryKey = settingsKeys.preferences(user?.id)

  return useMutation<
    Preferences,
    Error,
    Partial<Preferences>,
    { previous?: Preferences }
  >({
    mutationFn: async (patch) => {
      if (!user) {
        throw new Error('請先登入再修改設定。')
      }

      const current =
        queryClient.getQueryData<Preferences>(queryKey) ?? preferenceDefaults

      return savePreferences(user.id, { ...current, ...patch })
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Preferences>(queryKey)

      queryClient.setQueryData<Preferences>(queryKey, {
        ...(previous ?? preferenceDefaults),
        ...patch,
      })

      return { previous }
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      } else {
        queryClient.setQueryData(queryKey, preferenceDefaults)
      }
    },
    onSuccess: (preferences) => {
      queryClient.setQueryData(queryKey, preferences)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey })
    },
  })
}
