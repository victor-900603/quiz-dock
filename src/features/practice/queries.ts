import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  PracticeAttempt,
  PracticeMode,
  PracticeProgress,
  PracticeSession,
  PracticeSessionDetail,
  SubmitAnswerResult,
} from '../../types/quiz'
import {
  fetchPracticeSession,
  fetchPracticeSessions,
  startPracticeSession,
  submitPracticeAnswer,
  type SubmitAnswerInput,
} from './practiceService'

export const practiceKeys = {
  all: ['practice'] as const,
  sessions: () => [...practiceKeys.all, 'sessions'] as const,
  session: (sessionId: string) => [...practiceKeys.all, 'session', sessionId] as const,
}

export function usePracticeSessionsQuery() {
  return useQuery<PracticeProgress[]>({
    queryKey: practiceKeys.sessions(),
    queryFn: () => fetchPracticeSessions(),
  })
}

export function usePracticeSessionQuery(sessionId: string | undefined) {
  return useQuery<PracticeSessionDetail | null>({
    queryKey: practiceKeys.session(sessionId ?? ''),
    queryFn: () => fetchPracticeSession(sessionId as string),
    enabled: Boolean(sessionId),
  })
}

type StartPracticeInput = {
  setId: string
  mode: PracticeMode
  restart?: boolean
}

export function useStartPracticeMutation() {
  const queryClient = useQueryClient()

  return useMutation<PracticeSession, Error, StartPracticeInput>({
    mutationFn: ({ setId, mode, restart = false }) =>
      startPracticeSession(setId, mode, restart),
    onSuccess: (session) => {
      queryClient.removeQueries({ queryKey: practiceKeys.session(session.id) })
      queryClient.invalidateQueries({ queryKey: practiceKeys.sessions() })
    },
  })
}

export function useSubmitAnswerMutation() {
  const queryClient = useQueryClient()

  return useMutation<SubmitAnswerResult, Error, SubmitAnswerInput>({
    mutationFn: (input) => submitPracticeAnswer(input),
    onSuccess: (result, input) => {
      queryClient.setQueryData<PracticeSessionDetail>(
        practiceKeys.session(input.sessionId),
        (current) => {
          if (!current) return current

          const now = new Date().toISOString()
          const previous = current.attempts.find(
            (attempt) => attempt.questionId === input.questionId,
          )
          const attempt: PracticeAttempt = {
            questionId: input.questionId,
            selected: [...new Set(input.selected)].sort(),
            isCorrect: result.isCorrect,
            durationMs: input.durationMs ?? null,
            answeredAt: previous?.answeredAt ?? now,
            updatedAt: now,
          }

          return {
            ...current,
            session: {
              ...current.session,
              status: result.sessionStatus,
              currentIndex: result.currentIndex,
              answeredCount: result.answeredCount,
              correctCount: result.correctCount,
              completedAt:
                result.sessionStatus === 'completed'
                  ? current.session.completedAt ?? now
                  : null,
              updatedAt: now,
            },
            attempts: [
              ...current.attempts.filter(
                (item) => item.questionId !== input.questionId,
              ),
              attempt,
            ],
          }
        },
      )

      queryClient.invalidateQueries({ queryKey: practiceKeys.sessions() })
    },
  })
}
