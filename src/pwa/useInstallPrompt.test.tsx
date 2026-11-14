import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  initInstallPrompt,
  resetInstallPrompt,
} from './installPrompt'
import { useInstallPrompt } from './useInstallPrompt'

function createInstallEvent(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const event = new Event('beforeinstallprompt', { cancelable: true })

  Object.assign(event, {
    platforms: ['web'],
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome, platform: 'web' }),
  })

  return event
}

describe('useInstallPrompt', () => {
  let cleanup: () => void
  let originalMatchMedia: PropertyDescriptor | undefined

  beforeEach(() => {
    resetInstallPrompt()
    cleanup = initInstallPrompt()
    originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia')
  })

  afterEach(() => {
    cleanup()
    resetInstallPrompt()

    if (originalMatchMedia) {
      Object.defineProperty(window, 'matchMedia', originalMatchMedia)
    } else {
      Reflect.deleteProperty(window, 'matchMedia')
    }
  })

  it('exposes the deferred prompt and triggers installation', async () => {
    const { result } = renderHook(() => useInstallPrompt())

    expect(result.current.canInstall).toBe(false)
    expect(result.current.installed).toBe(false)
    expect(result.current.isIos).toBe(false)

    act(() => {
      window.dispatchEvent(createInstallEvent())
    })

    expect(result.current.canInstall).toBe(true)

    let outcome: string | undefined
    await act(async () => {
      outcome = await result.current.promptInstall()
    })

    expect(outcome).toBe('accepted')
    expect(result.current.canInstall).toBe(false)
  })

  it('recognizes an installed app event', () => {
    const { result } = renderHook(() => useInstallPrompt())

    act(() => {
      window.dispatchEvent(new Event('appinstalled'))
    })

    expect(result.current.installed).toBe(true)
  })

  it('recognizes the standalone display mode', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    })

    const { result } = renderHook(() => useInstallPrompt())

    expect(result.current.installed).toBe(true)
  })
})
