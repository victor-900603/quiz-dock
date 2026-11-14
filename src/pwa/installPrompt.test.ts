import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getInstallPromptState,
  initInstallPrompt,
  promptInstall,
  resetInstallPrompt,
  subscribeInstallPrompt,
} from './installPrompt'

function createInstallEvent(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const event = new Event('beforeinstallprompt', { cancelable: true })
  const prompt = vi.fn().mockResolvedValue(undefined)

  Object.assign(event, {
    platforms: ['web'],
    prompt,
    userChoice: Promise.resolve({ outcome, platform: 'web' }),
  })

  return { event, prompt }
}

describe('installPrompt', () => {
  let cleanup: () => void

  beforeEach(() => {
    resetInstallPrompt()
    cleanup = initInstallPrompt()
  })

  afterEach(() => {
    cleanup()
    resetInstallPrompt()
  })

  it('captures beforeinstallprompt and resolves the user choice', async () => {
    const listener = vi.fn()
    subscribeInstallPrompt(listener)
    const { event, prompt } = createInstallEvent('accepted')

    window.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(getInstallPromptState()).toEqual({ canInstall: true, installed: false })
    expect(listener).toHaveBeenCalledTimes(1)

    await expect(promptInstall()).resolves.toBe('accepted')
    expect(prompt).toHaveBeenCalledTimes(1)
    expect(getInstallPromptState()).toEqual({ canInstall: false, installed: false })
    expect(listener).toHaveBeenCalledTimes(2)

    await expect(promptInstall()).resolves.toBe('unavailable')
  })

  it('marks the app as installed after appinstalled', () => {
    window.dispatchEvent(createInstallEvent('dismissed').event)
    expect(getInstallPromptState().canInstall).toBe(true)

    window.dispatchEvent(new Event('appinstalled'))

    expect(getInstallPromptState()).toEqual({ canInstall: false, installed: true })
  })

  it('returns dismissed when the user rejects the prompt', async () => {
    window.dispatchEvent(createInstallEvent('dismissed').event)

    await expect(promptInstall()).resolves.toBe('dismissed')
  })

  it('reuses the listener registration', () => {
    expect(initInstallPrompt()).toBe(cleanup)
  })

  it('stops listening after cleanup', () => {
    cleanup()
    cleanup = () => {}

    window.dispatchEvent(createInstallEvent().event)

    expect(getInstallPromptState().canInstall).toBe(false)
  })
})
