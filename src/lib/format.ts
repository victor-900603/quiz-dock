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

const dateTimeFormatter = new Intl.DateTimeFormat('zh-TW', {
  timeZone: 'Asia/Taipei',
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function formatDateTime(value: string | null): string {
  if (!value) return '--'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'

  return dateTimeFormatter.format(date)
}

const shortDateTimeFormatter = new Intl.DateTimeFormat('zh-TW', {
  timeZone: 'Asia/Taipei',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatShortDateTime(value: string | null): string {
  if (!value) return '--'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'

  return shortDateTimeFormatter.format(date)
}
