import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  applyTheme,
  defaultThemePreference,
  getSystemTheme,
  getThemePreference,
  initTheme,
  resetTheme,
  resolveTheme,
  setThemePreference,
  subscribeThemePreference,
  themeStorageKey,
} from './theme'

type Listener = () => void

function stubMatchMedia(initialMatches: boolean) {
  const listeners = new Set<Listener>()
  const query = {
    matches: initialMatches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: vi.fn((_event: string, listener: Listener) => {
      listeners.add(listener)
    }),
    removeEventListener: vi.fn((_event: string, listener: Listener) => {
      listeners.delete(listener)
    }),
    dispatchEvent: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }

  const matchMedia = vi.fn(() => query as unknown as MediaQueryList)
  vi.stubGlobal('matchMedia', matchMedia)

  return {
    query,
    matchMedia,
    setMatches(next: boolean) {
      query.matches = next
      listeners.forEach((listener) => listener())
    },
    listenerCount: () => listeners.size,
  }
}

function themeColorMeta() {
  const meta = document.createElement('meta')
  meta.setAttribute('name', 'theme-color')
  meta.setAttribute('content', '#f6f1e7')
  document.head.append(meta)
  return meta
}

describe('theme preferences', () => {
  beforeEach(() => {
    resetTheme()
    window.localStorage.clear()
  })

  afterEach(() => {
    resetTheme()
    vi.unstubAllGlobals()
    document.querySelector('meta[name="theme-color"]')?.remove()
  })

  it('defaults to following the system', () => {
    expect(getThemePreference()).toBe(defaultThemePreference)
    expect(defaultThemePreference).toBe('system')
  })

  it('falls back to light when matchMedia is unavailable', () => {
    expect(getSystemTheme()).toBe('light')
    expect(resolveTheme('system')).toBe('light')
  })

  it('restores a stored preference and ignores invalid values', () => {
    window.localStorage.setItem(themeStorageKey, 'dark')
    expect(getThemePreference()).toBe('dark')

    resetTheme()
    window.localStorage.setItem(themeStorageKey, 'sepia')
    expect(getThemePreference()).toBe('system')
  })

  it('applies the resolved theme, color scheme, and theme color', () => {
    const meta = themeColorMeta()
    applyTheme('dark')

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
    expect(meta.getAttribute('content')).toBe('#14130f')

    applyTheme('light')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(document.documentElement.style.colorScheme).toBe('light')
    expect(meta.getAttribute('content')).toBe('#f6f1e7')
  })

  it('stores the preference and notifies subscribers', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeThemePreference(listener)

    setThemePreference('dark')

    expect(window.localStorage.getItem(themeStorageKey)).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    setThemePreference('light')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('follows system changes only while following the system', () => {
    const media = stubMatchMedia(false)
    initTheme()

    expect(document.documentElement.dataset.theme).toBe('light')
    expect(media.listenerCount()).toBe(1)

    media.setMatches(true)
    expect(document.documentElement.dataset.theme).toBe('dark')

    setThemePreference('light')
    media.setMatches(false)
    media.setMatches(true)
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('keeps a single system listener when initialized twice', () => {
    const media = stubMatchMedia(false)
    initTheme()
    initTheme()

    expect(media.listenerCount()).toBe(1)
  })

  it('clears the applied theme on reset', () => {
    const meta = themeColorMeta()
    setThemePreference('dark')

    resetTheme()

    expect(document.documentElement.dataset.theme).toBeUndefined()
    expect(document.documentElement.style.colorScheme).toBe('')
    expect(window.localStorage.getItem(themeStorageKey)).toBeNull()
    expect(meta.getAttribute('content')).toBe('#f6f1e7')
  })
})
