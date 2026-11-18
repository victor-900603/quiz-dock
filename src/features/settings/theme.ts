import { useSyncExternalStore } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const themePreferenceValues = ['light', 'dark', 'system'] as const

export const themeStorageKey = 'quizdock.theme'

export const defaultThemePreference: ThemePreference = 'system'

const themeColors: Record<ResolvedTheme, string> = {
  light: '#f6f1e7',
  dark: '#14130f',
}

let currentPreference: ThemePreference | null = null
let mediaQuery: MediaQueryList | null = null
let mediaListener: (() => void) | null = null
const listeners = new Set<() => void>()

function isThemePreference(value: unknown): value is ThemePreference {
  return (
    typeof value === 'string' &&
    (themePreferenceValues as readonly string[]).includes(value)
  )
}

function notify() {
  listeners.forEach((listener) => listener())
}

function readStoredPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(themeStorageKey)
    return isThemePreference(stored) ? stored : defaultThemePreference
  } catch {
    return defaultThemePreference
  }
}

export function getThemePreference(): ThemePreference {
  if (currentPreference === null) {
    currentPreference = readStoredPreference()
  }

  return currentPreference
}

export function getSystemTheme(): ResolvedTheme {
  if (typeof window.matchMedia !== 'function') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function resolveTheme(
  preference: ThemePreference = getThemePreference(),
): ResolvedTheme {
  return preference === 'system' ? getSystemTheme() : preference
}

export function applyTheme(preference: ThemePreference = getThemePreference()): void {
  const resolved = resolveTheme(preference)
  document.documentElement.dataset.theme = resolved
  document.documentElement.style.colorScheme = resolved

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', themeColors[resolved])
  }
}

function handleSystemChange() {
  if (getThemePreference() !== 'system') return
  applyTheme('system')
  notify()
}

export function initTheme(): void {
  applyTheme()

  if (typeof window.matchMedia !== 'function') return

  if (mediaQuery && mediaListener) {
    mediaQuery.removeEventListener('change', mediaListener)
  }

  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaListener = handleSystemChange
  mediaQuery.addEventListener('change', mediaListener)
}

export function setThemePreference(preference: ThemePreference): void {
  currentPreference = preference
  applyTheme(preference)

  try {
    window.localStorage.setItem(themeStorageKey, preference)
  } catch {
    // 無法寫入時仍套用本次選擇
  }

  notify()
}

export function subscribeThemePreference(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(
    subscribeThemePreference,
    getThemePreference,
    () => defaultThemePreference,
  )
}

export function resetTheme(): void {
  if (mediaQuery && mediaListener) {
    mediaQuery.removeEventListener('change', mediaListener)
  }

  mediaQuery = null
  mediaListener = null
  currentPreference = null

  try {
    window.localStorage.removeItem(themeStorageKey)
  } catch {
    // 測試或受限環境沒有可用 storage 時直接略過
  }

  delete document.documentElement.dataset.theme
  document.documentElement.style.colorScheme = ''

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', themeColors.light)
  }

  notify()
}
