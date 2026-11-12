export function formatPercent(correct: number, answered: number): string {
  if (answered <= 0) return '--'
  return `${((correct / answered) * 100).toFixed(1)}%`
}

export function formatPercentValue(value: number | null): string {
  return value === null ? '--' : `${value.toFixed(1)}%`
}

export function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.round(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  const remainingSeconds = safeSeconds % 60

  if (minutes === 0) return `${remainingSeconds} 秒`
  return `${minutes} 分 ${remainingSeconds} 秒`
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat('zh-TW').format(value)
}
