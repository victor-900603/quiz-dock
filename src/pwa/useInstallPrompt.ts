import { useSyncExternalStore } from 'react'
import { isIosDevice, isStandalone } from './device'
import {
  getInstallPromptState,
  promptInstall,
  subscribeInstallPrompt,
  type InstallOutcome,
} from './installPrompt'

type UseInstallPromptResult = {
  canInstall: boolean
  installed: boolean
  isIos: boolean
  promptInstall: () => Promise<InstallOutcome>
}

export function useInstallPrompt(): UseInstallPromptResult {
  const state = useSyncExternalStore(
    subscribeInstallPrompt,
    getInstallPromptState,
    getInstallPromptState,
  )

  return {
    canInstall: state.canInstall,
    installed: state.installed || isStandalone(),
    isIos: isIosDevice(),
    promptInstall,
  }
}
