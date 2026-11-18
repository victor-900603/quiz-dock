import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import { describeSupabaseError } from '../../lib/errors'
import { supabase } from '../../lib/supabase'
import { parsePreferences, type Preferences } from './preferences'

type Client = SupabaseClient<Database>

export async function fetchPreferences(
  userId: string,
  client: Client = supabase,
): Promise<Preferences> {
  const { data, error } = await client
    .from('user_settings')
    .select('preferences')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(describeSupabaseError(error, '無法載入偏好設定，請稍後再試。'))
  }

  return parsePreferences(data?.preferences)
}

export async function savePreferences(
  userId: string,
  preferences: Preferences,
  client: Client = supabase,
): Promise<Preferences> {
  const { data, error } = await client
    .from('user_settings')
    .upsert({ user_id: userId, preferences }, { onConflict: 'user_id' })
    .select('preferences')
    .maybeSingle()

  if (error) {
    throw new Error(describeSupabaseError(error, '無法儲存偏好設定，請稍後再試。'))
  }

  return parsePreferences(data?.preferences)
}
