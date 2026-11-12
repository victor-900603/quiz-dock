import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'
import { readSupabaseEnv } from './env'

const { url, anonKey } = readSupabaseEnv(import.meta.env)

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
