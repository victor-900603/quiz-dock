const taipeiDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Taipei',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function taipeiDateKey(value: Date | string = new Date()): string {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ''

  const parts = taipeiDateFormatter.formatToParts(date)
  const year = parts.find((part) => part.type === 'year')?.value ?? ''
  const month = parts.find((part) => part.type === 'month')?.value ?? ''
  const day = parts.find((part) => part.type === 'day')?.value ?? ''

  return `${year}-${month}-${day}`
}

export function shiftDateKey(day: string, offset: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  if (!match) return ''

  const [, year, month, date] = match
  const shifted = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(date) + offset),
  )

  return shifted.toISOString().slice(0, 10)
}
