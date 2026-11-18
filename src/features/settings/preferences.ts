import { z } from 'zod'

export type Preferences = {
  autoMarkWrong: boolean
}

export const preferenceDefaults: Preferences = {
  autoMarkWrong: false,
}

const preferencesSchema = z.object({
  autoMarkWrong: z.boolean().catch(preferenceDefaults.autoMarkWrong),
})

export function parsePreferences(value: unknown): Preferences {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ...preferenceDefaults }
  }

  const parsed = preferencesSchema.safeParse(value)
  return parsed.success ? parsed.data : { ...preferenceDefaults }
}
