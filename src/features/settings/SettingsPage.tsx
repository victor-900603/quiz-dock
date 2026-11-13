import { LogOut } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { PageHeader } from '../../components/PageHeader'
import { useAuth } from '../auth/AuthContext'

export function SettingsPage() {
  const { user, signOut } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return (
    <>
      <PageHeader
        eyebrow="帳號"
        title="設定"
        description="管理登入狀態與目前版本。"
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
        <p className="mt-2 text-sm text-muted">QuizDock 0.1.0・前端介面預覽</p>
        <p className="mt-2 text-xs leading-6 text-muted">
          登入與題庫已接上 Supabase；練習、標記與統計仍使用示範資料。
        </p>
      </Card>
    </>
  )
}
