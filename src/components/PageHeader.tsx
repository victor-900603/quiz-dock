import type { ReactNode } from 'react'

type PageHeaderProps = {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  actionsClassName?: string
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  actionsClassName = 'flex flex-wrap items-center gap-2',
}: PageHeaderProps) {
  return (
    <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 max-w-2xl">
        {eyebrow && (
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">{eyebrow}</p>
        )}
        <h1 className="mt-2 font-serif text-3xl leading-tight text-ink sm:text-4xl">{title}</h1>
        {description && <p className="mt-3 text-sm leading-6 text-muted">{description}</p>}
      </div>
      {actions && <div className={actionsClassName}>{actions}</div>}
    </header>
  )
}
