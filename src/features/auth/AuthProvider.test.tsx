import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './AuthContext'
import { supabase } from '../../lib/supabase'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  },
}))

const getSession = vi.mocked(supabase.auth.getSession)
const onAuthStateChange = vi.mocked(supabase.auth.onAuthStateChange)
const signInWithPassword = vi.mocked(supabase.auth.signInWithPassword)
const signOut = vi.mocked(supabase.auth.signOut)

describe('AuthProvider', () => {
  const unsubscribe = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    getSession.mockResolvedValue({ data: { session: null }, error: null } as never)
    onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe } },
    } as never)
    signOut.mockResolvedValue({ error: null } as never)
  })

  it('loads the current session and unsubscribes on unmount', async () => {
    getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1', email: 'victor@example.com' } } },
      error: null,
    } as never)

    const { result, unmount } = renderHook(() => useAuth(), { wrapper: AuthProvider })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user?.email).toBe('victor@example.com')

    unmount()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('returns a friendly message when sign in fails', async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    } as never)

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await waitFor(() => expect(result.current.loading).toBe(false))

    const message = await result.current.signIn('test@example.com', 'password123')

    expect(message).toBe('Email 或密碼錯誤，請再試一次。')
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })
  })

  it('returns null when sign in succeeds and signs out', async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@example.com' }, session: null },
      error: null,
    } as never)

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(result.current.signIn('test@example.com', 'password123')).resolves.toBeNull()
    await result.current.signOut()

    expect(signOut).toHaveBeenCalledTimes(1)
  })
})
