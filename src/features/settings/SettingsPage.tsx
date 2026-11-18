import type { ReactNode } from 'react'
import { Check, Download, Info, LogOut, Monitor, Moon, Share, Sun } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { PageHeader } from '../../components/PageHeader'
import { cn } from '../../lib/cn'
import { useInstallPrompt } from '../../pwa/useInstallPrompt'
import { useAuth } from '../auth/AuthContext'
import { usePreferences, useUpdatePreferences } from './queries'
import { ReadingScaleOptions } from './ReadingScaleControl'
import {
  setThemePreference,
  useThemePreference,
  type ThemePreference,
} from './theme'

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

const themeOptions: Array<{
  value: ThemePreference
  label: string
  icon: typeof Sun
}> = [
  { value: 'light', label: '淺色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
  { value: 'system', label: '跟隨系統', icon: Monitor },
]

function AppearanceSettingsCard() {
  const preference = useThemePreference()

  return (
    <Card className="mt-4 p-5 sm:p-6">
      <h2 className="font-serif text-xl text-ink">外觀</h2>
      <p className="mt-2 text-xs leading-6 text-muted">設定只儲存在這台裝置。</p>
      <div
        role="radiogroup"
        aria-label="主題"
        className="mt-4 grid grid-cols-3 gap-2"
      >
        {themeOptions.map((option) => {
          const checked = option.value === preference
          const Icon = option.icon

          return (
            <label
              key={option.value}
              className={cn(
                'flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-paper',
                checked
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-line bg-surface text-ink hover:border-accent/60',
              )}
            >
              <input
                type="radio"
                name="theme"
                value={option.value}
                checked={checked}
                onChange={() => setThemePreference(option.value)}
                className="sr-only"
              />
              <Icon aria-hidden="true" className="h-5 w-5" />
              <span className="text-xs">{option.label}</span>
            </label>
          )
        })}
      </div>
    </Card>
  )
}

function PracticeSettingsCard() {
  const { preferences, isPending, isError } = usePreferences()
  const updatePreferences = useUpdatePreferences()
  const error = updatePreferences.error ?? (isError ? new Error('無法載入偏好設定，請稍後再試。') : null)

  return (
    <Card className="mt-4 p-5 sm:p-6">
      <h2 className="font-serif text-xl text-ink">練習</h2>
      <p className="mt-2 text-xs leading-6 text-muted">這些設定會同步到你的帳號。</p>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">答錯時自動標記</p>
          <p className="mt-1 text-xs leading-6 text-muted">
            送出答案後，答錯的題目會自動加入標記，方便之後集中複習。
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={preferences.autoMarkWrong}
          aria-label="答錯時自動標記"
          disabled={isPending || updatePreferences.isPending}
          onClick={() =>
            updatePreferences.mutate({ autoMarkWrong: !preferences.autoMarkWrong })
          }
          className={cn(
            'relative mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
            preferences.autoMarkWrong
              ? 'border-accent bg-accent'
              : 'border-line bg-paper',
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'block h-4 w-4 rounded-full border border-line bg-surface shadow-sm transition-transform',
              preferences.autoMarkWrong ? 'translate-x-6' : 'translate-x-1',
            )}
          />
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-xs text-wrong">
          {error.message}
        </p>
      )}
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
        description="管理登入狀態、閱讀字級、版本與安裝。"
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

      <PracticeSettingsCard />

      <AppearanceSettingsCard />

      <Card className="mt-4 p-5 sm:p-6">
        <h2 className="font-serif text-xl text-ink">閱讀</h2>
        <p className="mt-2 text-xs leading-6 text-muted">
          調整題幹、選項與解析的字級，設定只儲存在這台裝置。
        </p>
        <ReadingScaleOptions className="mt-4" />
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
