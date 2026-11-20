import { useSyncExternalStore } from 'react'

export type PracticeLayout = 'stacked' | 'split'

export const practiceLayoutValues = ['stacked', 'split'] as const

export const practiceLayoutStorageKey = 'quizdock.practice-layout'

export const defaultPracticeLayout: PracticeLayout = 'stacked'

let currentLayout: PracticeLayout | null = null
const listeners = new Set<() => void>()

function isPracticeLayout(value: unknown): value is PracticeLayout {
  return (
    typeof value === 'string' &&
    (practiceLayoutValues as readonly string[]).includes(value)
  )
}

function notify() {
  listeners.forEach((listener) => listener())
}

function readStoredLayout(): PracticeLayout {
  try {
    const stored = window.localStorage.getItem(practiceLayoutStorageKey)
    return isPracticeLayout(stored) ? stored : defaultPracticeLayout
  } catch {
    return defaultPracticeLayout
  }
}

export function getPracticeLayout(): PracticeLayout {
  if (currentLayout === null) {
    currentLayout = readStoredLayout()
  }

  return currentLayout
}

export function setPracticeLayout(layout: PracticeLayout): void {
  currentLayout = layout

  try {
    window.localStorage.setItem(practiceLayoutStorageKey, layout)
  } catch {
    // 無法寫入時仍套用本次選擇
  }

  notify()
}

export function togglePracticeLayout(): void {
  setPracticeLayout(getPracticeLayout() === 'split' ? 'stacked' : 'split')
}

export function subscribePracticeLayout(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function usePracticeLayout(): PracticeLayout {
  return useSyncExternalStore(
    subscribePracticeLayout,
    getPracticeLayout,
    () => defaultPracticeLayout,
  )
}

export function resetPracticeLayout(): void {
  currentLayout = null

  try {
    window.localStorage.removeItem(practiceLayoutStorageKey)
  } catch {
    // 測試或受限環境沒有可用 storage 時直接略過
  }

  notify()
}
