import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsPage } from './SettingsPage'

const mocks = vi.hoisted(() => ({
  install: {
    canInstall: false,
    installed: false,
    isIos: false,
    promptInstall: vi.fn(),
  },
  signOut: vi.fn(),
}))

vi.mock('../../pwa/useInstallPrompt', () => ({
  useInstallPrompt: () => mocks.install,
}))

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'victor@example.com' },
    signOut: mocks.signOut,
  }),
}))

function renderSettings() {
  const queryClient = new QueryClient()

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SettingsPage', () => {
  beforeEach(() => {
    mocks.install = {
      canInstall: false,
      installed: false,
      isIos: false,
      promptInstall: vi.fn(),
    }
  })

  it('shows the install action when the browser offers it', async () => {
    const user = userEvent.setup()
    mocks.install.canInstall = true
    renderSettings()

    expect(screen.getByRole('heading', { name: '安裝' })).toBeInTheDocument()
    expect(screen.getByText('安裝到裝置')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '安裝應用程式' }))

    expect(mocks.install.promptInstall).toHaveBeenCalledTimes(1)
  })

  it('shows the installed state', () => {
    mocks.install.installed = true
    renderSettings()

    expect(screen.getByText('已安裝 QuizDock')).toBeInTheDocument()
    expect(
      screen.getByText('目前以獨立視窗開啟，可從主畫面或應用程式清單直接啟動。'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '安裝應用程式' })).not.toBeInTheDocument()
  })

  it('shows iOS add-to-home-screen instructions', () => {
    mocks.install.isIos = true
    renderSettings()

    expect(screen.getByText('加入主畫面')).toBeInTheDocument()
    expect(
      screen.getByText('在 Safari 點選分享按鈕，再選擇「加入主畫面」。'),
    ).toBeInTheDocument()
  })

  it('shows manual installation instructions as a fallback', () => {
    renderSettings()

    expect(screen.getByText('安裝到裝置')).toBeInTheDocument()
    expect(
      screen.getByText('從瀏覽器選單選擇「安裝應用程式」或「加到主畫面」。'),
    ).toBeInTheDocument()
  })

  it('keeps the account and version cards', () => {
    renderSettings()

    expect(screen.getByText('victor@example.com')).toBeInTheDocument()
    expect(screen.getByText('QuizDock 0.1.0')).toBeInTheDocument()
  })
})
