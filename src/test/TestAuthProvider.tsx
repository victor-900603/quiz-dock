import { useMemo, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { AuthContext, type AuthContextValue } from '../features/auth/AuthContext'

type TestAuthProviderProps = {
  children: ReactNode
  initialEmail?: string | null
}

export function TestAuthProvider({
  children,
  initialEmail = 'victor@example.com',
}: TestAuthProviderProps) {
  const [email, setEmail] = useState<string | null>(initialEmail)

  const value = useMemo<AuthContextValue>(
    () => ({
      user: email ? ({ id: 'test-user', email } as unknown as User) : null,
      session: null,
      loading: false,
      signIn: async (nextEmail) => {
        setEmail(nextEmail)
        return null
      },
      signOut: async () => {
        setEmail(null)
      },
    }),
    [email],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
