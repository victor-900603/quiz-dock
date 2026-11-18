import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Button, buttonStyles } from '../../components/Button'
import { Card } from '../../components/Card'
import { Skeleton } from '../../components/Skeleton'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'
import { useMarksQuery } from '../marks/queries'
import { QuestionBrowser } from './QuestionBrowser'
import { useSetQuery } from './queries'

export function SetQuestionsPage() {
  const { setId } = useParams()
  const setQuery = useSetQuery(setId)
  const marksQuery = useMarksQuery()

  if (setQuery.isPending) {
    return (
      <div role="status" aria-busy="true">
        <span className="sr-only">載入題庫中...</span>
        <div aria-hidden="true" className="space-y-6">
          <Skeleton className="h-4 w-24" />
          <div className="space-y-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Card className="space-y-4 p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full sm:w-48" />
            </div>
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="space-y-2 border-t border-line pt-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </Card>
        </div>
      </div>
    )
  }

  if (setQuery.isError) {
    return (
      <Card className="p-6" role="alert">
        <p className="text-sm text-wrong">
          {setQuery.error instanceof Error
            ? setQuery.error.message
            : '無法載入題庫，請稍後再試。'}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void setQuery.refetch()}>
            重新載入
          </Button>
          <Link to="/" className={buttonStyles('secondary')}>
            回題庫
          </Link>
        </div>
      </Card>
    )
  }

  const set = setQuery.data?.set

  if (!set) {
    return (
      <EmptyState
        title="找不到題庫"
        description="這個題庫不存在，或已經被移除。"
        action={
          <Link to="/" className={buttonStyles('secondary')}>
            回題庫
          </Link>
        }
      />
    )
  }

  const questions = setQuery.data?.questions ?? []
  const markedQuestionIds = new Set(
    (marksQuery.data ?? [])
      .filter((mark) => mark.setId === set.id)
      .map((mark) => mark.id),
  )

  return (
    <>
      <Link
        to={`/sets/${set.id}`}
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-accent"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        回題庫詳情
      </Link>

      <PageHeader
        eyebrow="題目瀏覽"
        title={set.title}
        description={`共 ${questions.length} 題，可搜尋題幹、選項或解析，展開後查看答案與解析。`}
      />

      <Card className="p-5 sm:p-6">
        <QuestionBrowser questions={questions} markedQuestionIds={markedQuestionIds} />
      </Card>
    </>
  )
}
