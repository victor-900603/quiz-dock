import type { ReactNode } from 'react'
import { Card } from './Card'

type StatCardProps = {
  label: string
  value: string
  hint?: string
  icon?: ReactNode
}

export function StatCard({ label, value, hint, icon }: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">{label}</p>
        {icon && <span className="text-muted">{icon}</span>}
      </div>
      <p className="mt-3 font-serif text-3xl leading-none text-ink">{value}</p>
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
    </Card>
  )
}
