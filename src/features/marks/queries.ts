import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { MarkedQuestion, Question } from '../../types/quiz'
import { useAuth } from '../auth/AuthContext'
import { addMark, fetchMarks, removeMark } from './marksService'

export const marksKeys = {
  all: ['marks'] as const,
}

export type ToggleMarkInput = {
  questionId: string
  marked: boolean
  question: Question
  setId: string
  setTitle: string
}

export function useMarksQuery() {
  return useQuery<MarkedQuestion[]>({
    queryKey: marksKeys.all,
    queryFn: () => fetchMarks(),
  })
}

export function useToggleMarkMutation() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation<void, Error, ToggleMarkInput, { previous?: MarkedQuestion[] }>({
    mutationFn: async (input) => {
      if (!user) {
        throw new Error('請先登入再標記題目。')
      }

      if (input.marked) {
        await removeMark(input.questionId, user.id)
      } else {
        await addMark(input.questionId, user.id)
      }
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: marksKeys.all })
      const previous = queryClient.getQueryData<MarkedQuestion[]>(marksKeys.all)

      queryClient.setQueryData<MarkedQuestion[]>(marksKeys.all, (current) => {
        const marks = current ?? []

        if (input.marked) {
          return marks.filter((mark) => mark.id !== input.questionId)
        }

        if (marks.some((mark) => mark.id === input.questionId)) return marks

        return [
          {
            ...input.question,
            setId: input.setId,
            setTitle: input.setTitle,
            markedAt: new Date().toISOString(),
          },
          ...marks,
        ]
      })

      return { previous }
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(marksKeys.all, context.previous)
      } else {
        queryClient.removeQueries({ queryKey: marksKeys.all })
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: marksKeys.all })
    },
  })
}
