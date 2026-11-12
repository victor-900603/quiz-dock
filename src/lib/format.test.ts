import { describe, expect, it } from 'vitest'
import { formatCount, formatDuration, formatPercent, formatPercentValue } from './format'

describe('formatPercent', () => {
  it('returns two dashes when nothing has been answered', () => {
    expect(formatPercent(0, 0)).toBe('--')
    expect(formatPercent(5, -1)).toBe('--')
  })

  it('rounds to one decimal place', () => {
    expect(formatPercent(1, 3)).toBe('33.3%')
    expect(formatPercent(2, 3)).toBe('66.7%')
    expect(formatPercent(5, 5)).toBe('100.0%')
  })
})

describe('formatPercentValue', () => {
  it('handles null and numeric values', () => {
    expect(formatPercentValue(null)).toBe('--')
    expect(formatPercentValue(78.5)).toBe('78.5%')
    expect(formatPercentValue(0)).toBe('0.0%')
  })
})

describe('formatDuration', () => {
  it('formats seconds under one minute', () => {
    expect(formatDuration(0)).toBe('0 秒')
    expect(formatDuration(59)).toBe('59 秒')
    expect(formatDuration(-10)).toBe('0 秒')
  })

  it('formats minutes and seconds', () => {
    expect(formatDuration(60)).toBe('1 分 0 秒')
    expect(formatDuration(125)).toBe('2 分 5 秒')
    expect(formatDuration(125.6)).toBe('2 分 6 秒')
  })
})

describe('formatCount', () => {
  it('formats numbers with zh-TW grouping', () => {
    expect(formatCount(1234)).toBe('1,234')
  })
})
