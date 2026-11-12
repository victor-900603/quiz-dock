import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button'
import { useMockStore } from '../../lib/mockStore'
import { AuthLayout, authInputClass } from './AuthLayout'

export function SignupPage() {
  const { login } = useMockStore()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!email.includes('@')) {
      setError('請輸入有效的 Email。')
      return
    }

    if (password.length < 8) {
      setError('密碼至少 8 碼。')
      return
    }

    if (password !== confirmPassword) {
      setError('兩次輸入的密碼不一致。')
      return
    }

    login(email)
    navigate('/', { replace: true })
  }

  return (
    <AuthLayout
      title="註冊"
      description="建立帳號後，題庫、標記與進度會跟著你跨裝置同步。"
      footer={
        <>
          <Link to="/login" className="font-medium text-accent hover:underline">
            已經有帳號？登入
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
          <label htmlFor="signup-email" className="text-sm font-medium text-ink">
            Email
          </label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={authInputClass}
          />
        </div>
        <div>
          <label htmlFor="signup-password" className="text-sm font-medium text-ink">
            密碼
          </label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={authInputClass}
          />
          <p className="mt-1 text-xs text-muted">至少 8 碼</p>
        </div>
        <div>
          <label htmlFor="signup-confirm" className="text-sm font-medium text-ink">
            確認密碼
          </label>
          <input
            id="signup-confirm"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className={authInputClass}
          />
        </div>
        <Button type="submit" className="w-full">
          建立帳號
        </Button>
      </form>
    </AuthLayout>
  )
}
