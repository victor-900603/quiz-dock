import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  applyReadingSize,
  defaultReadingSize,
  getReadingSize,
  initReadingSize,
  readingSizeStorageKey,
  resetReadingSize,
  setReadingSize,
  subscribeReadingSize,
} from './readingScale'

describe('readingScale', () => {
  beforeEach(() => {
    resetReadingSize()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    resetReadingSize()
  })

  it('defaults to the normal size', () => {
    expect(getReadingSize()).toBe(defaultReadingSize)
  })

  it('applies the stored size on init', () => {
    localStorage.setItem(readingSizeStorageKey, 'xlarge')

    initReadingSize()

    expect(getReadingSize()).toBe('xlarge')
    expect(document.documentElement.dataset.readingSize).toBe('xlarge')
  })

  it('falls back to the default size when the stored value is invalid', () => {
    localStorage.setItem(readingSizeStorageKey, 'huge')

    initReadingSize()

    expect(getReadingSize()).toBe('normal')
    expect(document.documentElement.dataset.readingSize).toBe('normal')
  })

  it('stores the selected size and notifies subscribers', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeReadingSize(listener)

    setReadingSize('large')

    expect(getReadingSize()).toBe('large')
    expect(localStorage.getItem(readingSizeStorageKey)).toBe('large')
    expect(document.documentElement.dataset.readingSize).toBe('large')
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    setReadingSize('small')

    expect(listener).toHaveBeenCalledTimes(1)
    expect(document.documentElement.dataset.readingSize).toBe('small')
  })

  it('applies a size directly', () => {
    applyReadingSize('small')

    expect(document.documentElement.dataset.readingSize).toBe('small')
  })

  it('keeps working when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked')
    })

    expect(getReadingSize()).toBe('normal')

    setReadingSize('xlarge')

    expect(getReadingSize()).toBe('xlarge')
    expect(document.documentElement.dataset.readingSize).toBe('xlarge')
  })

  it('resets the stored size and the document attribute', () => {
    setReadingSize('large')

    resetReadingSize()

    expect(document.documentElement.dataset.readingSize).toBeUndefined()
    expect(localStorage.getItem(readingSizeStorageKey)).toBeNull()
    expect(getReadingSize()).toBe('normal')
  })
})
