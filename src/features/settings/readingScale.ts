import { useSyncExternalStore } from 'react'

export type ReadingSize = 'small' | 'normal' | 'large' | 'xlarge'

export const readingSizeValues = ['small', 'normal', 'large', 'xlarge'] as const

export const readingSizeStorageKey = 'quizdock.reading-size'

export const defaultReadingSize: ReadingSize = 'normal'

let currentSize: ReadingSize | null = null
const listeners = new Set<() => void>()

function isReadingSize(value: unknown): value is ReadingSize {
  return (
    typeof value === 'string' &&
    (readingSizeValues as readonly string[]).includes(value)
  )
}

function notify() {
  listeners.forEach((listener) => listener())
}

function readStoredSize(): ReadingSize {
  try {
    const stored = window.localStorage.getItem(readingSizeStorageKey)
    return isReadingSize(stored) ? stored : defaultReadingSize
  } catch {
    return defaultReadingSize
  }
}

export function getReadingSize(): ReadingSize {
  if (currentSize === null) {
    currentSize = readStoredSize()
  }

  return currentSize
}

export function applyReadingSize(size: ReadingSize): void {
  document.documentElement.dataset.readingSize = size
}

export function initReadingSize(): void {
  applyReadingSize(getReadingSize())
}

export function setReadingSize(size: ReadingSize): void {
  currentSize = size
  applyReadingSize(size)

  try {
    window.localStorage.setItem(readingSizeStorageKey, size)
  } catch {
    // 無法寫入時仍套用本次選擇
  }

  notify()
}

export function subscribeReadingSize(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useReadingSize(): ReadingSize {
  return useSyncExternalStore(subscribeReadingSize, getReadingSize, () => defaultReadingSize)
}

export function resetReadingSize(): void {
  currentSize = null

  try {
    window.localStorage.removeItem(readingSizeStorageKey)
  } catch {
    // 測試或受限環境沒有可用 storage 時直接略過
  }

  delete document.documentElement.dataset.readingSize
  notify()
}
