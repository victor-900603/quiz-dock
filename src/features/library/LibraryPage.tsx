import { useState } from 'react'
import { ArrowRight, BookOpen, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import { buttonStyles, Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { ImportDialog } from '../../components/ImportDialog'
import { PageHeader } from '../../components/PageHeader'
import { ProgressBar } from '../../components/ProgressBar'
import { QuizSetCard } from '../../components/QuizSetCard'
import { useMockStore } from '../../lib/mockStore'
import type { ImportPreview } from '../../lib/importPreview'
import type { QuizSet } from '../../types/quiz'

export function LibraryPage() {
  const { sets, marks, addSet } = useMockStore()
  const [importOpen, setImportOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const activeSet = sets.find((set) => set.activeSession)
  const activeSession = activeSet?.activeSession

  function handleImport(preview: ImportPreview) {
    const importedSet: QuizSet = {
      id: `imported-${Date.now()}`,
      title: preview.title || '未命名題庫',
      description: preview.description || '由 JSON 匯入的題庫。',
      questionCount: preview.questionCount,
      topicCount: preview.topics.length,
      accuracy: null,
      answeredCount: 0,
      lastPracticedLabel: null,
      markedCount: 0,
      topics: preview.topics.map((topic) => ({ name: topic.name, answered: 0, correct: 0 })),
    }

    addSet(importedSet)
    setNotice(`已建立「${importedSet.title}」示範題庫。`)
  }

  return (
    <>
      <PageHeader
        eyebrow="QuizDock"
        title="我的題庫"
        description="挑一份題庫，從上次停下的地方繼續。"
        actions={
          <Button onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" aria-hidden="true" />
            匯入題庫
          </Button>
        }
      />

      {notice && (
        <div
          className="mb-6 rounded-lg border border-correct/30 bg-correct-soft px-4 py-3 text-sm text-correct"
          role="status"
        >
          {notice}
        </div>
      )}

      {activeSet && activeSession && (
        <Card className="mb-6 overflow-hidden p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">進行中</p>
              <h2 className="mt-1 font-serif text-xl text-ink">{activeSet.title}</h2>
              <p className="mt-1 text-sm text-muted">
                已答 {activeSession.answered} / {activeSession.total} 題
              </p>
            </div>
            <Link
              to={`/practice/${activeSession.id}?setId=${activeSet.id}&mode=${activeSession.mode}&resume=1`}
              className={buttonStyles('primary')}
            >
              繼續練習
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-5">
            <ProgressBar
              answered={activeSession.answered}
              total={activeSession.total}
              label="目前進度"
            />
          </div>
        </Card>
      )}

      {sets.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-8 w-8" aria-hidden="true" />}
          title="還沒有題庫"
          description="先匯入一份 JSON，開始建立你的練習本。"
          action={
            <Button onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" aria-hidden="true" />
              匯入題庫
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sets.map((set) => (
            <QuizSetCard
              key={set.id}
              set={set}
              markedCount={marks.filter((mark) => mark.setId === set.id).length}
            />
          ))}
        </div>
      )}

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImport}
      />
    </>
  )
}
