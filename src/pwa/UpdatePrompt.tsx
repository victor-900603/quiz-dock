import { useSyncExternalStore } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '../components/Button'
import { dismissUpdate, getPwaState, subscribePwa } from './pwaStore'

export function UpdatePrompt() {
  const { needRefresh, updateSW } = useSyncExternalStore(
    subscribePwa,
    getPwaState,
    getPwaState,
  )

  if (!needRefresh) return null

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
            <p className="mt-1 text-xs leading-5 text-muted">重新載入後會套用最新版本。</p>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" onClick={dismissUpdate}>
            稍後
          </Button>
          <Button onClick={() => void updateSW?.(true)}>重新載入</Button>
        </div>
      </div>
    </section>
  )
}
