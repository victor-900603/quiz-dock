import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, ListChecks } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, buttonStyles } from '../../components/Button'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { ProgressBar } from '../../components/ProgressBar'
import { QuestionCard } from '../../components/QuestionCard'
import {
  QuestionNavigator,
  type QuestionNavigatorItem,
} from '../../components/QuestionNavigator'
import type { PracticeSessionDetail } from '../../types/quiz'
import { isMultiAnswer } from './evaluate'
import { usePracticeSessionQuery, useSubmitAnswerMutation } from './queries'
import {
  findNextUnanswered,
  hydrateAnswers,
  resolveStartIndex,
  type AnswerState,
} from './session'

export function PracticePage() {
  const { sessionId } = useParams()
  const [searchParams] = useSearchParams()
  const sessionQuery = usePracticeSessionQuery(sessionId)
  const setId = searchParams.get('setId')
  const backHref = setId ? `/sets/${setId}` : '/'

  if (!sessionId) {
    return (
      <EmptyState
        title="找不到練習"
        description="這場練習不存在，或已經被移除。"
        action={
          <Link to={backHref} className={buttonStyles('secondary')}>
            回題庫
          </Link>
        }
      />
    )
  }

  if (sessionQuery.isPending) {
    return (
      <Card className="p-6 text-sm text-muted" role="status">
        載入練習中...
      </Card>
    )
  }

  if (sessionQuery.isError) {
    return (
      <Card className="p-6" role="alert">
        <p className="text-sm text-wrong">
          {sessionQuery.error instanceof Error
            ? sessionQuery.error.message
            : '無法載入練習，請稍後再試。'}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void sessionQuery.refetch()}>
            重新載入
          </Button>
          <Link to={backHref} className={buttonStyles('secondary')}>
            回題庫
          </Link>
        </div>
      </Card>
    )
  }

  const detail = sessionQuery.data
  if (!detail) {
    return (
      <EmptyState
        title="找不到練習"
        description="這場練習不存在，或已經被移除。"
        action={
          <Link to={backHref} className={buttonStyles('secondary')}>
            回題庫
          </Link>
        }
      />
    )
  }

  if (detail.session.status === 'abandoned') {
    return (
      <EmptyState
        title="此場練習已結束"
        description="這場練習已結束，請回到題庫重新開始。"
        action={
          <Link to={`/sets/${detail.set.id}`} className={buttonStyles('secondary')}>
            回題庫
          </Link>
        }
      />
    )
  }

  return (
    <PracticeSessionView
      key={detail.session.id}
      sessionId={sessionId}
      detail={detail}
    />
  )
}

type PracticeSessionViewProps = {
  sessionId: string
  detail: PracticeSessionDetail
}

function PracticeSessionView({ sessionId, detail }: PracticeSessionViewProps) {
  const navigate = useNavigate()
  const submitMutation = useSubmitAnswerMutation()
  const { session, set, questions, attempts } = detail
  const total = questions.length
  const mode = session.mode

  const initialAnswers = useMemo(
    () =>
      hydrateAnswers(
        attempts.map((attempt) => ({
          questionId: attempt.questionId,
          selected: attempt.selected,
          correct: attempt.isCorrect,
        })),
      ),
    [attempts],
  )

  const [answers, setAnswers] = useState<Record<string, AnswerState>>(initialAnswers)
  const [index, setIndex] = useState(() =>
    resolveStartIndex(
      questions,
      initialAnswers,
      session.currentIndex,
      session.status === 'completed',
    ),
  )
  const [showStatus, setShowStatus] = useState(true)
  const [navigatorOpen, setNavigatorOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editSelected, setEditSelected] = useState<string[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [updateNotice, setUpdateNotice] = useState<string | null>(null)
  const [sessionCounts, setSessionCounts] = useState({
    answered: session.answeredCount,
    correct: session.correctCount,
  })
  const [serverCurrentIndex, setServerCurrentIndex] = useState(session.currentIndex)
  const [sessionStatus, setSessionStatus] = useState(session.status)
  const [lastAnsweredIndex, setLastAnsweredIndex] = useState<number | null>(null)
  const questionStartedAt = useRef(Date.now())

  const question = questions[index]
  const currentAnswer = question ? answers[question.id] : undefined
  const selected = editing ? editSelected : currentAnswer?.selected ?? []
  const submitted = currentAnswer?.submitted ?? false
  const answeredCount = sessionCounts.answered
  const correctCount = sessionCounts.correct
  const remaining = total - answeredCount

  const navigatorItems = useMemo<QuestionNavigatorItem[]>(
    () =>
      questions.map((item) => {
        const answer = answers[item.id]
        const status = answer?.submitted
          ? answer.correct
            ? 'correct'
            : 'wrong'
          : answer?.selected.length
            ? 'in-progress'
            : 'unanswered'

        return { id: item.id, number: item.number, status }
      }),
    [answers, questions],
  )

  useEffect(() => {
    setEditing(false)
    setEditSelected([])
    setSubmitError(null)
    setUpdateNotice(null)
    questionStartedAt.current = Date.now()
  }, [index, question?.id])

  function toggleOption(key: string) {
    if (!question || submitMutation.isPending || (submitted && !editing)) return

    setNavigatorOpen(false)
    const multi = isMultiAnswer(currentAnswer?.correctAnswers ?? question.correctAnswers)

    if (editing) {
      setEditSelected((current) =>
        multi
          ? current.includes(key)
            ? current.filter((item) => item !== key)
            : [...current, key]
          : [key],
      )
      return
    }

    setAnswers((current) => {
      const existing = current[question.id]?.selected ?? []
      const nextSelected = multi
        ? existing.includes(key)
          ? existing.filter((item) => item !== key)
          : [...existing, key]
        : [key]

      return {
        ...current,
        [question.id]: {
          selected: nextSelected,
          submitted: false,
          correct: false,
        },
      }
    })
  }

  async function handleSubmit() {
    if (!question || selected.length === 0 || submitMutation.isPending) return
    if (!editing && submitted) return

    setNavigatorOpen(false)
    setSubmitError(null)
    const durationMs = Math.max(0, Date.now() - questionStartedAt.current)

    try {
      const result = await submitMutation.mutateAsync({
        sessionId,
        questionId: question.id,
        selected,
        durationMs,
      })

      setAnswers((current) => ({
        ...current,
        [question.id]: {
          selected,
          submitted: true,
          correct: result.isCorrect,
          correctAnswers: result.correctAnswers,
          explanation: result.explanation,
        },
      }))
      setSessionCounts({
        answered: result.answeredCount,
        correct: result.correctCount,
      })
      setServerCurrentIndex(result.currentIndex)
      setSessionStatus(result.sessionStatus)
      setLastAnsweredIndex(index)
      setUpdateNotice(editing && result.wasUpdated ? '答案已更新。' : null)
      setEditing(false)
      setEditSelected([])
      questionStartedAt.current = Date.now()
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : '無法送出答案，請稍後再試。',
      )
    }
  }

  function handleEdit() {
    if (!question || !submitted) return
    setEditSelected(selected)
    setEditing(true)
    setSubmitError(null)
    setUpdateNotice(null)
    setNavigatorOpen(false)
    questionStartedAt.current = Date.now()
  }

  function handleCancelEdit() {
    setEditing(false)
    setEditSelected([])
    setUpdateNotice(null)
  }

  function handleNext() {
    if (editing) return

    setNavigatorOpen(false)

    if (sessionStatus === 'completed') {
      navigate(`/results/${sessionId}?setId=${set.id}`)
      return
    }

    if (lastAnsweredIndex === index) {
      const serverNext = serverCurrentIndex
      if (
        serverNext >= 0 &&
        serverNext < total &&
        !answers[questions[serverNext].id]?.submitted
      ) {
        setIndex(serverNext)
        return
      }
    }

    const nextIndex = findNextUnanswered(questions, answers, index)
    if (nextIndex === -1) {
      navigate(`/results/${sessionId}?setId=${set.id}`)
      return
    }

    setIndex(nextIndex)
  }

  function handleJump(targetIndex: number) {
    if (targetIndex < 0 || targetIndex >= total) return
    setIndex(targetIndex)
  }

  function handlePreviousQuestion() {
    setNavigatorOpen(false)
    setIndex((current) => Math.max(0, current - 1))
  }

  function handleNextQuestion() {
    setNavigatorOpen(false)
    setIndex((current) => Math.min(total - 1, current + 1))
  }

  function openNavigator() {
    setNavigatorOpen(true)
  }

  function closeNavigator() {
    setNavigatorOpen(false)
  }

  useEffect(() => {
    if (!navigatorOpen) return

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setNavigatorOpen(false)
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [navigatorOpen])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      if (event.key >= '1' && event.key <= '9') {
        const option = question?.options[Number(event.key) - 1]
        if (option && (!submitted || editing)) {
          event.preventDefault()
          toggleOption(option.key)
        }
      }

      if (event.key === 'Enter') {
        if (editing) {
          if (selected.length > 0) {
            event.preventDefault()
            void handleSubmit()
          }
        } else if (submitted) {
          event.preventDefault()
          handleNext()
        } else if (selected.length > 0) {
          event.preventDefault()
          void handleSubmit()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  if (!question) {
    return (
      <EmptyState
        title="找不到題目"
        description="這場練習沒有可用的題目。"
        action={
          <Link to={`/sets/${set.id}`} className={buttonStyles('secondary')}>
            回題庫
          </Link>
        }
      />
    )
  }

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-30 border-b border-line bg-paper lg:hidden">
        <div className="flex h-16 items-center gap-2 px-4 sm:px-6">
          <Link
            to={`/sets/${set.id}`}
            aria-label="返回題庫"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-serif text-base leading-tight text-ink">{set.title}</p>
            <p className="mt-0.5 text-[11px] text-muted">
              {mode === 'random' ? '隨機模式' : '依序模式'}
            </p>
          </div>
        </div>
      </header>

      <div className="mb-6 hidden items-center justify-between gap-3 lg:flex">
        <Link
          to={`/sets/${set.id}`}
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          離開練習
        </Link>
        <div className="flex items-center gap-4">
          {remaining === 0 && (
            <Link
              to={`/results/${sessionId}?setId=${set.id}`}
              className="text-sm text-accent hover:underline"
            >
              返回摘要
            </Link>
          )}
          <span className="font-mono text-xs text-muted">
            {mode === 'random' ? '隨機模式' : '依序模式'}
          </span>
        </div>
      </div>

      <div className="mb-5">
        <div className="hidden flex-wrap items-center justify-between gap-2 lg:flex">
          <h1 className="font-serif text-2xl text-ink">{set.title}</h1>
          {!navigatorOpen && (
            <button
              type="button"
              onClick={openNavigator}
              onKeyDown={(event) => event.stopPropagation()}
              aria-expanded={false}
              aria-controls="question-navigator-panel"
              aria-label={`開啟題號列表，已答 ${answeredCount} / ${total} 題，答對 ${correctCount} 題`}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-3 text-sm font-medium text-ink shadow-card transition-colors hover:border-accent/60 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              <ListChecks className="h-4 w-4 text-accent" aria-hidden="true" />
              <span>題號</span>
              <span className="font-mono text-xs font-normal text-muted">
                {answeredCount}/{total}
              </span>
            </button>
          )}
        </div>
        <div className="lg:mt-3">
          <ProgressBar
            answered={answeredCount}
            total={total}
            label={`第 ${Math.min(index + 1, total)} / ${total} 題`}
          />
        </div>
      </div>

      <QuestionCard
        question={question}
        selected={selected}
        submitted={submitted}
        editing={editing}
        marked={false}
        showMark={false}
        submitting={submitMutation.isPending}
        correct={submitted ? currentAnswer?.correct : undefined}
        correctAnswers={currentAnswer?.correctAnswers}
        explanation={currentAnswer?.explanation}
        isLast={remaining === 0}
        onToggleOption={toggleOption}
        onToggleMark={() => undefined}
        onSubmit={() => void handleSubmit()}
        onEdit={handleEdit}
        onCancelEdit={handleCancelEdit}
        onNext={handleNext}
      />

      {submitError && (
        <p className="mt-4 text-sm text-wrong" role="alert">
          {submitError}
        </p>
      )}

      {updateNotice && (
        <p className="mt-4 text-sm text-correct" role="status">
          {updateNotice}
        </p>
      )}

      <p className="mt-4 hidden text-center text-xs text-muted lg:block">
        可從題號列表跳到任一題；離開後進度會保留。
      </p>

      <nav
        aria-label="答題工具列"
        className={`fixed inset-x-0 bottom-0 z-30 border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden ${
          navigatorOpen ? 'border-t-0' : 'border-t'
        }`}
      >
        <div className="grid grid-cols-3">
          <button
            type="button"
            onClick={handlePreviousQuestion}
            disabled={index <= 0}
            aria-label="切換到上一題"
            className="flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:cursor-not-allowed disabled:text-muted/40 disabled:hover:text-muted/40"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            <span>上一題</span>
          </button>
          <button
            type="button"
            onClick={navigatorOpen ? closeNavigator : openNavigator}
            onKeyDown={(event) => event.stopPropagation()}
            aria-expanded={navigatorOpen}
            aria-controls="question-navigator-panel"
            aria-label={`${navigatorOpen ? '收合' : '展開'}題號列表，已答 ${answeredCount} / ${total} 題，答對 ${correctCount} 題`}
            className={`relative flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${
              navigatorOpen ? 'text-accent' : 'text-muted hover:text-ink'
            }`}
          >
            {navigatorOpen && (
              <span
                className="absolute inset-x-0 top-0 mx-auto h-0.5 w-8 bg-accent"
                aria-hidden="true"
              />
            )}
            <ListChecks className="h-5 w-5" aria-hidden="true" />
            <span>題號</span>
          </button>
          <button
            type="button"
            onClick={handleNextQuestion}
            disabled={index >= total - 1}
            aria-label="切換到下一題"
            className="flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:cursor-not-allowed disabled:text-muted/40 disabled:hover:text-muted/40"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
            <span>下一題</span>
          </button>
        </div>
      </nav>

      {navigatorOpen && (
        <div
          id="question-navigator-panel"
          className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 lg:bottom-6 lg:left-[calc(50%+7.5rem)] lg:right-auto lg:w-[calc(100vw-19rem)] lg:max-w-3xl lg:-translate-x-1/2"
        >
          <div className="animate-navigator-rise">
            <QuestionNavigator
              variant="dock"
              items={navigatorItems}
              currentIndex={index}
              answeredCount={answeredCount}
              total={total}
              showStatus={showStatus}
              onToggleStatus={() => setShowStatus((value) => !value)}
              onJump={handleJump}
              onClose={closeNavigator}
            />
          </div>
        </div>
      )}
    </>
  )
}
