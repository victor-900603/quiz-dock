import type { ReactNode } from 'react'
import { BookOpen } from 'lucide-react'
import { Card } from '../../components/Card'

export const authInputClass =
  'mt-2 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20'

export function AuthLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string
  description: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface text-accent">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="mt-4 font-serif text-3xl text-ink">QuizDock</p>
          <p className="mt-2 text-sm text-muted">把題庫變成每天都能翻開的練習本。</p>
        </div>

        <Card className="p-6 sm:p-8">
          <h1 className="font-serif text-2xl text-ink">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
          {children}
        </Card>

        {footer && <div className="mt-4 text-center text-xs text-muted">{footer}</div>}
      </div>
    </main>
  )
}
