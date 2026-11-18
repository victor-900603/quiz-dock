import type { SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Database } from '../../types/database'
import {
  TEST_OWNER_ID,
  createFakeSupabase,
  getSharedFakeSupabase,
  type FakeSupabase,
} from '../../test/fakeSupabase'
import { fetchPreferences, savePreferences } from './preferencesService'

function client(fake: FakeSupabase): SupabaseClient<Database> {
  return fake as unknown as SupabaseClient<Database>
}

describe('preferencesService', () => {
  beforeEach(() => {
    getSharedFakeSupabase().reset()
  })

  it('returns defaults when the user has no stored settings', async () => {
    const fake = createFakeSupabase()
    await expect(fetchPreferences(TEST_OWNER_ID, client(fake))).resolves.toEqual({
      autoMarkWrong: false,
    })
  })

  it('reads stored preferences', async () => {
    const fake = createFakeSupabase({
      user_settings: [
        {
          user_id: TEST_OWNER_ID,
          preferences: { autoMarkWrong: true },
          updated_at: '2026-11-18T00:00:00.000Z',
        },
      ],
    })

    await expect(fetchPreferences(TEST_OWNER_ID, client(fake))).resolves.toEqual({
      autoMarkWrong: true,
    })
  })

  it('creates and updates the settings row', async () => {
    const fake = createFakeSupabase()

    await savePreferences(TEST_OWNER_ID, { autoMarkWrong: true }, client(fake))
    expect(fake.tables.user_settings).toHaveLength(1)
    expect(fake.tables.user_settings[0].preferences).toEqual({
      autoMarkWrong: true,
    })

    await savePreferences(TEST_OWNER_ID, { autoMarkWrong: false }, client(fake))
    expect(fake.tables.user_settings).toHaveLength(1)
    expect(fake.tables.user_settings[0].preferences).toEqual({
      autoMarkWrong: false,
    })
  })

  it('reports a load failure', async () => {
    const fake = createFakeSupabase()
    fake.failNextSelect('user_settings', { message: 'denied' })

    await expect(fetchPreferences(TEST_OWNER_ID, client(fake))).rejects.toThrow(
      '無法載入偏好設定，請稍後再試。',
    )
  })

  it('reports a save failure', async () => {
    const fake = createFakeSupabase()
    fake.failNextAction('user_settings', 'upsert', { message: 'denied' })

    await expect(
      savePreferences(TEST_OWNER_ID, { autoMarkWrong: true }, client(fake)),
    ).rejects.toThrow('無法儲存偏好設定，請稍後再試。')
  })
})
