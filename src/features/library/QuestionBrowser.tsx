import { useDeferredValue, useMemo, useState } from 'react'
import { ChevronDown, Search, Star } from 'lucide-react'
import { AnswerReview } from '../../components/AnswerReview'
import { Button } from '../../components/Button'
import type { Question } from '../../types/quiz'

const PAGE_SIZE = 20
const topicCollator = new Intl.Collator('zh-TW', { numeric: true })

type QuestionBrowserProps = {
  questions: Question[]
  markedQuestionIds?: ReadonlySet<string>
}

function normalize(value: string) {
  return value.toLocaleLowerCase('zh-TW')
}

function questionNumberLabel(number: number) {
  return `#${String(number).padStart(3, '0')}`
}

export function QuestionBrowser({ questions, markedQuestionIds }: QuestionBrowserProps) {
  const [query, setQuery] = useState('')
  const [topic, setTopic] = useState('all')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const deferredQuery = useDeferredValue(query)

  const topics = useMemo(() => {
    const names = new Set(questions.map((question) => question.topic).filter(Boolean))
    return [...names].sort(topicCollator.compare)
  }, [questions])

  const filtered = useMemo(() => {
    const needle = normalize(deferredQuery.trim())
    const numericQuery = /^\d+$/.test(needle) ? Number(needle) : null

    return questions.filter((question) => {
      if (topic !== 'all' && question.topic !== topic) return false
      if (!needle) return true
      if (numericQuery !== null && question.number === numericQuery) return true

      return (
        normalize(question.prompt).includes(needle) ||
        question.options.some((option) => normalize(option.text).includes(needle)) ||
        normalize(question.explanation).includes(needle)
      )
    })
  }, [questions, topic, deferredQuery])

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visible.length < filtered.length

  function changeQuery(value: string) {
    setQuery(value)
    setVisibleCount(PAGE_SIZE)
  }

  function changeTopic(value: string) {
    setTopic(value)
    setVisibleCount(PAGE_SIZE)
  }

  if (questions.length === 0) {
    return <p className="mt-4 text-sm text-muted">這個題庫沒有題目。</p>
  }

  return (
    <div className="mt-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => changeQuery(event.target.value)}
            placeholder="搜尋題幹、選項或解析，也可輸入題號"
            aria-label="搜尋題目"
            className="min-h-11 w-full rounded-lg border border-line bg-paper pl-9 pr-3 text-sm text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <select
          value={topic}
          onChange={(event) => changeTopic(event.target.value)}
          aria-label="依主題篩選"
          className="min-h-11 rounded-lg border border-line bg-paper px-3 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 sm:w-56"
        >
          <option value="all">全部主題</option>
          {topics.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <p className="mt-3 text-xs text-muted" role="status">
        顯示 {visible.length} / {filtered.length} 題
      </p>

      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-muted">找不到符合的題目。</p>
      ) : (
        <div className="mt-3 divide-y divide-line border-y border-line">
          {visible.map((question) => {
            const marked = markedQuestionIds?.has(question.id) ?? false

            return (
              <details key={question.id} className="group py-3">
                <summary className="flex cursor-pointer list-none items-start gap-3 rounded-md px-1 py-1 text-sm hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [&::-webkit-details-marker]:hidden">
                  <ChevronDown
                    className="mt-0.5 h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180"
                    aria-hidden="true"
                  />
                  <span className="mt-0.5 shrink-0 font-mono text-xs text-muted">
                    {questionNumberLabel(question.number)}
                  </span>
                  <span className="mt-0.5 shrink-0 rounded-full border border-line bg-paper px-2 py-0.5 text-[11px] text-muted">
                    {question.topic}
                  </span>
                  {marked && (
                    <>
                      <Star
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 fill-current text-accent"
                        aria-hidden="true"
                      />
                      <span className="sr-only">已標記</span>
                    </>
                  )}
                  <span className="min-w-0 flex-1 leading-6 text-ink">{question.prompt}</span>
                </summary>

                <div className="mt-3 pl-3 sm:pl-7">
                  <AnswerReview
                    options={question.options}
                    correctAnswers={question.correctAnswers}
                    explanation={question.explanation}
                  />
                </div>
              </details>
            )
          })}
        </div>
      )}

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
            載入更多
          </Button>
        </div>
      )}
    </div>
  )
}
