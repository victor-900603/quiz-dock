import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, ListChecks } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { buttonStyles } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { ProgressBar } from '../../components/ProgressBar'
import { QuestionCard } from '../../components/QuestionCard'
import {
  QuestionNavigator,
  type QuestionNavigatorItem,
} from '../../components/QuestionNavigator'
import { mockQuestionsBySet } from '../../data/mock'
import { evaluateAnswer, isMultiAnswer } from './evaluate'
import {
  findFirstUnanswered,
  findNextUnanswered,
  hydrateAnswers,
  summarizeAnswers,
  type AnswerState,
} from './session'
import { useMockStore } from '../../lib/mockStore'
import type { Question, SessionSummary } from '../../types/quiz'

const EMPTY_QUESTIONS: Question[] = []

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]]
  }
  return copy
}

export function PracticePage() {
  const { sessionId = 'demo-session' } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { sets, marks, toggleMark, savePractice, resetPractice } = useMockStore()

  const setId = searchParams.get('setId') ?? sets[0]?.id
  const mode = searchParams.get('mode') === 'random' ? 'random' : 'sequential'
  const resume = searchParams.get('resume') === '1'
  const restart = searchParams.get('restart') === '1'
  const set = sets.find((item) => item.id === setId)
  const baseQuestions = useMemo(
    () => mockQuestionsBySet[setId ?? ''] ?? EMPTY_QUESTIONS,
    [setId],
  )
  const questions = useMemo(
    () => (mode === 'random' ? shuffle(baseQuestions) : baseQuestions),
    [baseQuestions, mode],
  )
  const resumedAttempts = useMemo(
    () => (resume ? set?.activeSession?.attempts ?? [] : []),
    [resume, set?.activeSession?.attempts],
  )
  const initialAnswers = useMemo(() => hydrateAnswers(resumedAttempts), [resumedAttempts])

  const [index, setIndex] = useState(() => findFirstUnanswered(questions, initialAnswers))
  const [answers, setAnswers] = useState<Record<string, AnswerState>>(initialAnswers)
  const [showStatus, setShowStatus] = useState(true)
  const [navigatorOpen, setNavigatorOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editSelected, setEditSelected] = useState<string[]>([])
  const startedAt = useRef(Date.now())
  const restartApplied = useRef(false)
  const initKey = useRef('')

  const question = questions[index]
  const total = questions.length
  const currentAnswer = question ? answers[question.id] : undefined
  const selected = editing ? editSelected : currentAnswer?.selected ?? []
  const submitted = currentAnswer?.submitted ?? false
  const progress = useMemo(() => summarizeAnswers(questions, answers), [questions, answers])
  const remaining = total - progress.answered

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
    if (!restart || !set || restartApplied.current) return
    restartApplied.current = true
    resetPractice(set.id, mode)
  }, [restart, set, mode, resetPractice])

  useEffect(() => {
    const key = `${sessionId}:${setId}:${mode}:${resume ? 'resume' : 'fresh'}:${restart ? 'restart' : 'normal'}`
    if (initKey.current === key) return
    initKey.current = key

    const nextAnswers = hydrateAnswers(!restart && resume ? set?.activeSession?.attempts ?? [] : [])
    setAnswers(nextAnswers)
    setIndex(restart ? 0 : findFirstUnanswered(questions, nextAnswers))
    setEditing(false)
    setEditSelected([])
    startedAt.current = Date.now()
  }, [questions, resume, restart, sessionId, set, setId, mode])

  useEffect(() => {
    setEditing(false)
    setEditSelected([])
  }, [index, question?.id])

  function toggleOption(key: string) {
    if (!question || (submitted && !editing)) return

    setNavigatorOpen(false)

    if (editing) {
      setEditSelected((current) =>
        isMultiAnswer(question.correctAnswers)
          ? current.includes(key)
            ? current.filter((item) => item !== key)
            : [...current, key]
          : [key],
      )
      return
    }

    setAnswers((current) => {
      const existing = current[question.id]?.selected ?? []
      const nextSelected = isMultiAnswer(question.correctAnswers)
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

  function handleSubmit() {
    if (!set || !question || selected.length === 0) return
    if (!editing && submitted) return

    setNavigatorOpen(false)
    const correct = evaluateAnswer(selected, question.correctAnswers)
    const nextAnswers = {
      ...answers,
      [question.id]: {
        selected,
        submitted: true,
        correct,
      },
    }
    const nextProgress = summarizeAnswers(questions, nextAnswers)
    const attempts = questions
      .filter((item) => nextAnswers[item.id]?.submitted)
      .map((item) => ({
        questionId: item.id,
        selected: nextAnswers[item.id].selected,
        correct: nextAnswers[item.id].correct,
      }))

    setAnswers(nextAnswers)
    savePractice(set.id, {
      id: sessionId,
      answered: nextProgress.answered,
      correct: nextProgress.correct,
      total,
      mode,
      attempts,
    })
    setEditing(false)
    setEditSelected([])
  }

  function handleEdit() {
    if (!question || !submitted) return
    setEditSelected(selected)
    setEditing(true)
    setNavigatorOpen(false)
  }

  function handleCancelEdit() {
    setEditing(false)
    setEditSelected([])
  }

  function handleNext() {
    if (!set || !submitted || editing) return

    setNavigatorOpen(false)
    const nextIndex = findNextUnanswered(questions, answers, index)
    if (nextIndex === -1) {
      const summary: SessionSummary = {
        setId: set.id,
        setTitle: set.title,
        mode,
        answered: progress.answered,
        correct: progress.correct,
        durationSeconds: Math.max(1, Math.round((Date.now() - startedAt.current) / 1000)),
        topics: progress.topics,
      }

      navigate(`/results/${sessionId}`, { state: summary })
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
            handleSubmit()
          }
        } else if (submitted) {
          event.preventDefault()
          handleNext()
        } else if (selected.length > 0) {
          event.preventDefault()
          handleSubmit()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  if (!set || !question) {
    return (
      <EmptyState
        title="找不到題目"
        description="這個題庫還沒有可練習的題目，或網址不正確。"
        action={
          <Link to="/" className={buttonStyles('secondary')}>
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
        <span className="font-mono text-xs text-muted">
          {mode === 'random' ? '隨機模式' : '依序模式'}
        </span>
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
              aria-label={`開啟題號列表，已答 ${progress.answered} / ${total} 題`}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-3 text-sm font-medium text-ink shadow-card transition-colors hover:border-accent/60 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              <ListChecks className="h-4 w-4 text-accent" aria-hidden="true" />
              <span>題號</span>
              <span className="font-mono text-xs font-normal text-muted">
                {progress.answered}/{total}
              </span>
            </button>
          )}
        </div>
        <div className="lg:mt-3">
          <ProgressBar
            answered={progress.answered}
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
        marked={marks.some((mark) => mark.id === question.id)}
        isLast={remaining === 0}
        onToggleOption={toggleOption}
        onToggleMark={() => toggleMark(question.id)}
        onSubmit={handleSubmit}
        onEdit={handleEdit}
        onCancelEdit={handleCancelEdit}
        onNext={handleNext}
      />

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
            aria-label={`${navigatorOpen ? '收合' : '展開'}題號列表，已答 ${progress.answered} / ${total} 題`}
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
              answeredCount={progress.answered}
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
