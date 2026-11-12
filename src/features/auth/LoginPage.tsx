import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/Button'
import { useMockStore } from '../../lib/mockStore'
import { AuthLayout, authInputClass } from './AuthLayout'

export function LoginPage() {
  const { login } = useMockStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('victor@example.com')
  const [password, setPassword] = useState('password')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!email.includes('@') || password.length < 8) {
      setError('請輸入有效的 Email，密碼至少 8 碼。')
      return
    }

    login(email)
    const next = searchParams.get('next')
    navigate(next?.startsWith('/') ? next : '/', { replace: true })
  }

  return (
    <AuthLayout
      title="登入"
      description="示範模式：任意 Email 與 8 碼以上密碼即可登入。"
      footer={
        <>
          <Link to="/signup" className="font-medium text-accent hover:underline">
            還沒有帳號？註冊
          </Link>
          <span className="mx-2 text-line">·</span>
          <Link to="/" className="hover:text-accent">
            回到題庫
          </Link>
        </>
      }
    >
      {error && (
        <p className="mt-4 rounded-lg border border-wrong/30 bg-wrong-soft px-3 py-2 text-sm text-wrong" role="alert">
          {error}
        </p>
      )}

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="login-email" className="text-sm font-medium text-ink">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={authInputClass}
          />
        </div>
        <div>
          <label htmlFor="login-password" className="text-sm font-medium text-ink">
            密碼
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={authInputClass}
          />
          <p className="mt-1 text-xs text-muted">至少 8 碼</p>
        </div>
        <Button type="submit" className="w-full">
          登入
        </Button>
      </form>
    </AuthLayout>
  )
}
