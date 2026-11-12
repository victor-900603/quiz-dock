import type { ReactNode } from 'react'
import { Card } from './Card'

type EmptyStateProps = {
  icon?: ReactNode
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {icon && <div className="mb-4 text-muted">{icon}</div>}
      <h2 className="font-serif text-2xl text-ink">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </Card>
  )
}
