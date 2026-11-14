import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from './useOnlineStatus'

export function OfflineNotice() {
  const online = useOnlineStatus()

  if (online) return null

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 border-b border-highlight/40 bg-highlight-soft px-4 py-2 text-center text-xs text-ink"
    >
      <WifiOff className="h-4 w-4 shrink-0 text-highlight" aria-hidden="true" />
      目前離線，僅能瀏覽已快取的畫面。練習與儲存需要網路連線。
    </div>
  )
}
