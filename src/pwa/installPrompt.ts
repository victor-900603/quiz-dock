export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable'

export type InstallPromptState = {
  canInstall: boolean
  installed: boolean
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt: () => Promise<void>
}

const initialState: InstallPromptState = {
  canInstall: false,
  installed: false,
}

let state = initialState
let deferredPrompt: BeforeInstallPromptEvent | null = null
let detach: (() => void) | null = null
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((listener) => listener())
}

function setState(next: Partial<InstallPromptState>) {
  state = { ...state, ...next }
  notify()
}

export function subscribeInstallPrompt(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getInstallPromptState(): InstallPromptState {
  return state
}

export function initInstallPrompt(): () => void {
  if (typeof window === 'undefined') return () => {}
  if (detach) return detach

  const handleBeforeInstallPrompt = (event: Event) => {
    event.preventDefault()
    deferredPrompt = event as BeforeInstallPromptEvent
    setState({ canInstall: true })
  }

  const handleAppInstalled = () => {
    deferredPrompt = null
    setState({ canInstall: false, installed: true })
  }

  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.addEventListener('appinstalled', handleAppInstalled)

  detach = () => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.removeEventListener('appinstalled', handleAppInstalled)
    detach = null
  }

  return detach
}

export async function promptInstall(): Promise<InstallOutcome> {
  const event = deferredPrompt
  if (!event) return 'unavailable'

  deferredPrompt = null
  setState({ canInstall: false })

  await event.prompt()
  const choice = await event.userChoice
  return choice.outcome
}

export function resetInstallPrompt(): void {
  detach?.()
  deferredPrompt = null
  state = initialState
  notify()
}
