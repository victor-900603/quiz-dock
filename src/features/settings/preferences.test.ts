import { describe, expect, it } from 'vitest'
import { parsePreferences, preferenceDefaults } from './preferences'

describe('parsePreferences', () => {
  it('returns the defaults for missing data', () => {
    expect(parsePreferences(null)).toEqual(preferenceDefaults)
    expect(parsePreferences(undefined)).toEqual(preferenceDefaults)
    expect(parsePreferences([])).toEqual(preferenceDefaults)
    expect(parsePreferences('value')).toEqual(preferenceDefaults)
  })

  it('keeps a valid stored value', () => {
    expect(parsePreferences({ autoMarkWrong: true })).toEqual({
      autoMarkWrong: true,
    })
  })

  it('falls back for a wrongly typed field', () => {
    expect(parsePreferences({ autoMarkWrong: 'yes' })).toEqual({
      autoMarkWrong: false,
    })
  })
})
