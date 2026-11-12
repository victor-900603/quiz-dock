import { describe, expect, it } from 'vitest'
import { getBasename } from './router'

describe('getBasename', () => {
  it('keeps the root basename for local development', () => {
    expect(getBasename('/')).toBe('/')
  })

  it('removes the trailing slash from a project site base', () => {
    expect(getBasename('/quiz-dock/')).toBe('/quiz-dock')
  })

  it('accepts a base without a trailing slash', () => {
    expect(getBasename('/quiz-dock')).toBe('/quiz-dock')
  })
})
