import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  applySidebarState,
  defaultSidebarState,
  getSidebarState,
  initSidebar,
  resetSidebar,
  setSidebarState,
  sidebarStorageKey,
  subscribeSidebar,
  toggleSidebar,
} from './sidebar'

describe('sidebar state', () => {
  beforeEach(() => {
    resetSidebar()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    resetSidebar()
  })

  it('defaults to expanded', () => {
    expect(getSidebarState()).toBe(defaultSidebarState)
  })

  it('applies the stored state on init', () => {
    localStorage.setItem(sidebarStorageKey, 'collapsed')

    initSidebar()

    expect(getSidebarState()).toBe('collapsed')
    expect(document.documentElement.dataset.sidebar).toBe('collapsed')
  })

  it('falls back to expanded when the stored value is invalid', () => {
    localStorage.setItem(sidebarStorageKey, 'tiny')

    initSidebar()

    expect(getSidebarState()).toBe('expanded')
    expect(document.documentElement.dataset.sidebar).toBe('expanded')
  })

  it('stores the selected state and notifies subscribers', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeSidebar(listener)

    setSidebarState('collapsed')

    expect(getSidebarState()).toBe('collapsed')
    expect(localStorage.getItem(sidebarStorageKey)).toBe('collapsed')
    expect(document.documentElement.dataset.sidebar).toBe('collapsed')
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    setSidebarState('expanded')

    expect(listener).toHaveBeenCalledTimes(1)
    expect(document.documentElement.dataset.sidebar).toBe('expanded')
  })

  it('toggles between expanded and collapsed', () => {
    toggleSidebar()
    expect(getSidebarState()).toBe('collapsed')

    toggleSidebar()
    expect(getSidebarState()).toBe('expanded')
  })

  it('applies a state directly', () => {
    applySidebarState('collapsed')

    expect(document.documentElement.dataset.sidebar).toBe('collapsed')
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

    expect(getSidebarState()).toBe('expanded')

    setSidebarState('collapsed')

    expect(getSidebarState()).toBe('collapsed')
    expect(document.documentElement.dataset.sidebar).toBe('collapsed')
  })

  it('resets the stored state and the document attribute', () => {
    setSidebarState('collapsed')

    resetSidebar()

    expect(document.documentElement.dataset.sidebar).toBeUndefined()
    expect(localStorage.getItem(sidebarStorageKey)).toBeNull()
    expect(getSidebarState()).toBe('expanded')
  })
})
