export type SupabaseEnv = {
  url: string
  anonKey: string
}

export function readSupabaseEnv(env: Record<string, string | undefined>): SupabaseEnv {
  const url = env.VITE_SUPABASE_URL?.trim()
  const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim()

  if (!url || !anonKey) {
    throw new Error(
      '缺少 Supabase 環境變數，請設定 VITE_SUPABASE_URL 與 VITE_SUPABASE_ANON_KEY。',
    )
  }

  return { url, anonKey }
}
