type ProgressBarProps = {
  answered: number
  total: number
  label?: string
}

export function ProgressBar({ answered, total, label }: ProgressBarProps) {
  const percentage = total > 0 ? Math.min(100, Math.round((answered / total) * 100)) : 0
  const current = total > 0 ? Math.min(answered + 1, total) : 0

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs text-muted">
        <span>{label ?? `第 ${current} / ${total} 題`}</span>
        <span className="font-mono">{percentage}%</span>
      </div>
      <div
        className="mt-2 h-[2px] w-full overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={answered}
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-150"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
