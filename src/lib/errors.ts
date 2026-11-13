import { ImportError } from '../schemas/import'

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') return message
  }
  return ''
}

export function describeSupabaseError(error: unknown, fallback: string): string {
  if (error instanceof ImportError) return error.message

  const message = errorMessage(error)
  const normalized = message.toLowerCase()

  if (
    normalized.includes('row-level security') ||
    normalized.includes('permission denied') ||
    normalized.includes('not authorized') ||
    normalized.includes('jwt') ||
    normalized.includes('invalid claim')
  ) {
    return '沒有權限執行此操作，請重新登入後再試一次。'
  }

  if (
    normalized.includes('failed to fetch') ||
    normalized.includes('networkerror') ||
    normalized.includes('network error') ||
    normalized.includes('fetch failed') ||
    normalized.includes('load failed')
  ) {
    return '無法連線到伺服器，請檢查網路後再試一次。'
  }

  return fallback
}
