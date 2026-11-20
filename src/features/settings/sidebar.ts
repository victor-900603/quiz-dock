import { useSyncExternalStore } from 'react'

export type SidebarState = 'expanded' | 'collapsed'

export const sidebarStateValues = ['expanded', 'collapsed'] as const

export const sidebarStorageKey = 'quizdock.sidebar'

export const defaultSidebarState: SidebarState = 'expanded'

let currentState: SidebarState | null = null
const listeners = new Set<() => void>()

function isSidebarState(value: unknown): value is SidebarState {
  return (
    typeof value === 'string' &&
    (sidebarStateValues as readonly string[]).includes(value)
  )
}

function notify() {
  listeners.forEach((listener) => listener())
}

function readStoredState(): SidebarState {
  try {
    const stored = window.localStorage.getItem(sidebarStorageKey)
    return isSidebarState(stored) ? stored : defaultSidebarState
  } catch {
    return defaultSidebarState
  }
}

export function getSidebarState(): SidebarState {
  if (currentState === null) {
    currentState = readStoredState()
  }

  return currentState
}

export function applySidebarState(state: SidebarState): void {
  document.documentElement.dataset.sidebar = state
}

export function initSidebar(): void {
  applySidebarState(getSidebarState())
}

export function setSidebarState(state: SidebarState): void {
  currentState = state
  applySidebarState(state)

  try {
    window.localStorage.setItem(sidebarStorageKey, state)
  } catch {
    // 無法寫入時仍套用本次選擇
  }

  notify()
}

export function toggleSidebar(): void {
  setSidebarState(getSidebarState() === 'collapsed' ? 'expanded' : 'collapsed')
}

export function subscribeSidebar(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useSidebarState(): SidebarState {
  return useSyncExternalStore(
    subscribeSidebar,
    getSidebarState,
    () => defaultSidebarState,
  )
}

export function resetSidebar(): void {
  currentState = null

  try {
    window.localStorage.removeItem(sidebarStorageKey)
  } catch {
    // 測試或受限環境沒有可用 storage 時直接略過
  }

  delete document.documentElement.dataset.sidebar
  notify()
}
