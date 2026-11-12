import { describe, expect, it } from 'vitest'
import { readSupabaseEnv } from './env'

describe('readSupabaseEnv', () => {
  it('returns trimmed values', () => {
    expect(
      readSupabaseEnv({
        VITE_SUPABASE_URL: ' https://example.supabase.co ',
        VITE_SUPABASE_ANON_KEY: ' key ',
      }),
    ).toEqual({ url: 'https://example.supabase.co', anonKey: 'key' })
  })

  it('throws when the url is missing', () => {
    expect(() => readSupabaseEnv({ VITE_SUPABASE_ANON_KEY: 'key' })).toThrow(
      '缺少 Supabase 環境變數',
    )
  })

  it('throws when the anon key is missing', () => {
    expect(() => readSupabaseEnv({ VITE_SUPABASE_URL: 'https://example.supabase.co' })).toThrow(
      '缺少 Supabase 環境變數',
    )
  })
})
