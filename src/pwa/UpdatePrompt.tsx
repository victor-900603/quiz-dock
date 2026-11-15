import { useState, useSyncExternalStore } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '../components/Button'
import {
  dismissUpdate,
  getPwaState,
  subscribePwa,
  type UpdateServiceWorker,
} from './pwaStore'

type UpdatePhase = 'idle' | 'updating' | 'reloading' | 'error'

const descriptions: Record<UpdatePhase, string> = {
  idle: '重新載入後會套用最新版本。',
  updating: '正在套用新版本，完成後會自動重新載入。',
  reloading: '已套用新版本，正在重新載入...',
  error: '更新失敗，請檢查網路後再試一次。',
}

const buttonLabels: Record<UpdatePhase, string> = {
  idle: '重新載入',
  updating: '更新中...',
  reloading: '重新載入中...',
  error: '重新載入',
}

export function UpdatePrompt() {
  const { needRefresh, updateSW } = useSyncExternalStore(
    subscribePwa,
    getPwaState,
    getPwaState,
  )

  if (!needRefresh) return null

  return <UpdatePromptContent updateSW={updateSW} />
}

function UpdatePromptContent({ updateSW }: { updateSW: UpdateServiceWorker | null }) {
  const [phase, setPhase] = useState<UpdatePhase>('idle')
  const isBusy = phase === 'updating' || phase === 'reloading'

  async function handleUpdate() {
    if (!updateSW || isBusy) return

    setPhase('updating')

    try {
      await updateSW(true)
      setPhase('reloading')
    } catch {
      setPhase('error')
    }
  }

  return (
    <section
      aria-label="應用程式更新"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] shadow-card"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-medium text-ink">有新版本可用</p>
            <p
              className="mt-1 text-xs leading-5 text-muted"
              role={phase === 'error' ? 'alert' : 'status'}
            >
              {descriptions[phase]}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" onClick={dismissUpdate} disabled={isBusy}>
            稍後
          </Button>
          <Button loading={isBusy} onClick={() => void handleUpdate()}>
            {buttonLabels[phase]}
          </Button>
        </div>
      </div>
    </section>
  )
}
