import type { ReactNode } from 'react'
import { Check, Download, Info, LogOut, Share } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { PageHeader } from '../../components/PageHeader'
import { useInstallPrompt } from '../../pwa/useInstallPrompt'
import { useAuth } from '../auth/AuthContext'

function InstallCard() {
  const { canInstall, installed, isIos, promptInstall } = useInstallPrompt()

  let icon: ReactNode = <Info className="h-5 w-5" aria-hidden="true" />
  let title = '安裝到裝置'
  let description = '從瀏覽器選單選擇「安裝應用程式」或「加到主畫面」。'
  let action: ReactNode = null

  if (installed) {
    icon = <Check className="h-5 w-5" aria-hidden="true" />
    title = '已安裝 QuizDock'
    description = '目前以獨立視窗開啟，可從主畫面或應用程式清單直接啟動。'
  } else if (canInstall) {
    icon = <Download className="h-5 w-5" aria-hidden="true" />
    description = '安裝後可從主畫面快速開啟，並以獨立視窗顯示。'
    action = (
      <Button className="mt-4" onClick={() => void promptInstall()}>
        <Download className="h-4 w-4" aria-hidden="true" />
        安裝應用程式
      </Button>
    )
  } else if (isIos) {
    icon = <Share className="h-5 w-5" aria-hidden="true" />
    title = '加入主畫面'
    description = '在 Safari 點選分享按鈕，再選擇「加入主畫面」。'
  }

  return (
    <Card className="mt-4 p-5 sm:p-6">
      <h2 className="font-serif text-xl text-ink">安裝</h2>
      <div className="mt-3 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">{title}</p>
          <p className="mt-1 text-xs leading-6 text-muted">{description}</p>
          {action}
        </div>
      </div>
    </Card>
  )
}

export function SettingsPage() {
  const { user, signOut } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return (
    <>
      <PageHeader
        eyebrow="帳號"
        title="設定"
        description="管理登入狀態、目前版本與安裝。"
      />

      <Card className="p-5 sm:p-6">
        <h2 className="font-serif text-xl text-ink">帳號</h2>
        <p className="mt-3 text-sm text-muted">登入 Email</p>
        <p className="mt-1 text-sm text-ink">{user?.email ?? '未登入'}</p>
        <Button
          variant="secondary"
          className="mt-5"
          onClick={async () => {
            await signOut()
            queryClient.clear()
            navigate('/login')
          }}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          登出
        </Button>
      </Card>

      <Card className="mt-4 p-5 sm:p-6">
        <h2 className="font-serif text-xl text-ink">版本</h2>
        <p className="mt-2 text-sm text-muted">QuizDock 0.1.0</p>
        <p className="mt-2 text-xs leading-6 text-muted">
          登入、題庫、練習、標記與統計皆使用 Supabase。P0 不開放公開註冊。
        </p>
      </Card>

      <InstallCard />
    </>
  )
}
