import { BarChart3, BookOpen, Library, Settings, Star, type LucideIcon } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { cn } from '../lib/cn'
import { useAuth } from '../features/auth/AuthContext'
import { OfflineNotice } from '../pwa/OfflineNotice'

type NavItem = {
  to: string
  label: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { to: '/', label: '題庫', icon: Library },
  { to: '/marks', label: '標記', icon: Star },
  { to: '/stats', label: '統計', icon: BarChart3 },
  { to: '/settings', label: '設定', icon: Settings },
]

function pageTitle(pathname: string): string {
  if (pathname.startsWith('/sets/')) return '題庫詳情'
  if (pathname.startsWith('/practice/')) return '練習'
  if (pathname.startsWith('/results/')) return '練習摘要'
  return navItems.find((item) => item.to === pathname)?.label ?? 'QuizDock'
}

function SideNav() {
  const { user } = useAuth()

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-line bg-surface px-5 py-8 lg:flex">
      <Link
        to="/"
        className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-paper text-accent">
          <BookOpen className="h-5 w-5" aria-hidden="true" />
        </span>
        <span>
          <span className="block font-serif text-xl leading-none text-ink">QuizDock</span>
          <span className="mt-1 block text-[10px] uppercase tracking-[0.18em] text-muted">練習題庫</span>
        </span>
      </Link>

      <nav className="mt-10 space-y-1" aria-label="主要導覽">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 items-center gap-3 rounded-lg border-l-2 px-3 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  isActive
                    ? 'border-accent bg-accent-soft/60 font-medium text-accent'
                    : 'border-transparent text-muted hover:bg-paper hover:text-ink',
                )
              }
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      <div className="mt-auto border-t border-line pt-5">
        <p className="text-[10px] uppercase tracking-[0.14em] text-muted">登入中</p>
        <p className="mt-1 truncate text-sm text-ink">{user?.email ?? '未登入'}</p>
      </div>
    </aside>
  )
}

function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="主要導覽"
    >
      <div className="grid grid-cols-4">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'relative flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
                  isActive ? 'text-accent' : 'text-muted',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute inset-x-0 top-0 mx-auto h-0.5 w-8 bg-accent" />}
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

export function AppShell() {
  const location = useLocation()
  const title = pageTitle(location.pathname)
  const isPractice = location.pathname.startsWith('/practice/')

  return (
    <div className="min-h-screen bg-paper">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:text-surface"
      >
        跳至主要內容
      </a>

      <SideNav />

      <div className="lg:pl-60">
        <OfflineNotice />

        {!isPractice && (
          <header className="sticky top-0 z-20 border-b border-line bg-paper lg:hidden">
            <div className="flex h-16 items-center justify-between gap-3 px-4">
              <Link to="/" className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-accent" aria-hidden="true" />
                <span className="font-serif text-lg text-ink">QuizDock</span>
              </Link>
              <span className="truncate text-sm text-muted">{title}</span>
            </div>
          </header>
        )}

        <main
          id="main-content"
          className={cn(
            'mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8',
            isPractice
              ? 'pb-24 pt-20 lg:pb-16 lg:pt-10'
              : 'pb-28 pt-6 lg:pb-16 lg:pt-10',
          )}
        >
          <Outlet />
        </main>
      </div>

      {!isPractice && <BottomNav />}
    </div>
  )
}
