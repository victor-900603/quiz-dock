import { describe, expect, it } from 'vitest'
import { shiftDateKey, taipeiDateKey } from './dates'

describe('date helpers', () => {
  it('formats dates in Asia/Taipei', () => {
    expect(taipeiDateKey('2026-11-13T15:59:59.999Z')).toBe('2026-11-13')
    expect(taipeiDateKey('2026-11-13T16:00:00.000Z')).toBe('2026-11-14')
    expect(taipeiDateKey('invalid')).toBe('')
  })

  it('shifts date keys across month and year boundaries', () => {
    expect(shiftDateKey('2026-03-01', -1)).toBe('2026-02-28')
    expect(shiftDateKey('2026-01-01', -1)).toBe('2025-12-31')
    expect(shiftDateKey('2026-12-31', 1)).toBe('2027-01-01')
    expect(shiftDateKey('invalid', 1)).toBe('')
  })
})
