import { formatPercent } from '../lib/format'

type AccuracySummaryProps = {
  correct: number
  answered: number
}

export function AccuracySummary({ correct, answered }: AccuracySummaryProps) {
  return (
    <div>
      <p className="font-serif text-5xl leading-none text-ink">{formatPercent(correct, answered)}</p>
      <p className="mt-3 text-sm text-muted">
        答對 {correct} / 已答 {answered}
      </p>
    </div>
  )
}
