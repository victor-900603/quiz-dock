import { Link } from 'react-router-dom'
import { buttonStyles } from '../components/Button'
import { EmptyState } from '../components/EmptyState'

export function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-4">
      <EmptyState
        title="找不到頁面"
        description="這個網址不存在，或內容已經移除。"
        action={
          <Link to="/" className={buttonStyles('primary')}>
            回題庫
          </Link>
        }
      />
    </main>
  )
}
