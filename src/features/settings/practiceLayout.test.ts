import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  defaultPracticeLayout,
  getPracticeLayout,
  practiceLayoutStorageKey,
  resetPracticeLayout,
  setPracticeLayout,
  subscribePracticeLayout,
  togglePracticeLayout,
} from './practiceLayout'

describe('practiceLayout', () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetPracticeLayout()
  })

  afterEach(() => {
    resetPracticeLayout()
    vi.restoreAllMocks()
  })

  it('defaults to the stacked layout', () => {
    expect(defaultPracticeLayout).toBe('stacked')
    expect(getPracticeLayout()).toBe('stacked')
  })

  it('reads a stored split layout', () => {
    window.localStorage.setItem(practiceLayoutStorageKey, 'split')

    expect(getPracticeLayout()).toBe('split')
  })

  it('falls back to stacked for an invalid stored value', () => {
    window.localStorage.setItem(practiceLayoutStorageKey, 'wide')

    expect(getPracticeLayout()).toBe('stacked')
  })

  it('persists and notifies subscribers when changed', () => {
    const listener = vi.fn()
    const unsubscribe = subscribePracticeLayout(listener)

    setPracticeLayout('split')

    expect(getPracticeLayout()).toBe('split')
    expect(window.localStorage.getItem(practiceLayoutStorageKey)).toBe('split')
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    setPracticeLayout('stacked')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('toggles between stacked and split', () => {
    togglePracticeLayout()
    expect(getPracticeLayout()).toBe('split')

    togglePracticeLayout()
    expect(getPracticeLayout()).toBe('stacked')
  })

  it('keeps working when storage is unavailable', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })

    expect(getPracticeLayout()).toBe('stacked')
    expect(() => setPracticeLayout('split')).not.toThrow()
    expect(getPracticeLayout()).toBe('split')
  })

  it('clears the stored value and notifies subscribers on reset', () => {
    const listener = vi.fn()
    subscribePracticeLayout(listener)
    setPracticeLayout('split')

    resetPracticeLayout()

    expect(getPracticeLayout()).toBe('stacked')
    expect(window.localStorage.getItem(practiceLayoutStorageKey)).toBeNull()
    expect(listener).toHaveBeenCalledTimes(2)
  })
})
