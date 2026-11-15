import { cn } from '../lib/cn'

type ProgressBarProps = {
  answered: number
  total: number
  label?: string
  compact?: boolean
}

export function ProgressBar({ answered, total, label, compact = false }: ProgressBarProps) {
  const percentage = total > 0 ? Math.min(100, Math.round((answered / total) * 100)) : 0
  const current = total > 0 ? Math.min(answered + 1, total) : 0

  return (
    <div>
      {!compact && (
        <div className="flex items-center justify-between gap-3 text-xs text-muted">
          <span>{label ?? `第 ${current} / ${total} 題`}</span>
          <span className="font-mono">{percentage}%</span>
        </div>
      )}
      <div
        className={cn('h-[2px] w-full overflow-hidden rounded-full bg-line', !compact && 'mt-2')}
        role="progressbar"
        aria-label={compact ? '答題進度' : undefined}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={answered}
        aria-valuetext={`已答 ${answered} / ${total} 題`}
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-150"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
