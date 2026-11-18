import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsPage } from './SettingsPage'
import { readingSizeStorageKey, resetReadingSize } from './readingScale'

const mocks = vi.hoisted(() => ({
  install: {
    canInstall: false,
    installed: false,
    isIos: false,
    promptInstall: vi.fn(),
  },
  signOut: vi.fn(),
}))

const preferencesMocks = vi.hoisted(() => ({
  fetchPreferences: vi.fn(),
  savePreferences: vi.fn(),
}))

vi.mock('../../pwa/useInstallPrompt', () => ({
  useInstallPrompt: () => mocks.install,
}))

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'victor@example.com' },
    signOut: mocks.signOut,
  }),
}))

vi.mock('./preferencesService', () => ({
  fetchPreferences: preferencesMocks.fetchPreferences,
  savePreferences: preferencesMocks.savePreferences,
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
    resetReadingSize()
    mocks.install = {
      canInstall: false,
      installed: false,
      isIos: false,
      promptInstall: vi.fn(),
    }
    preferencesMocks.fetchPreferences.mockReset()
    preferencesMocks.savePreferences.mockReset()
    preferencesMocks.fetchPreferences.mockResolvedValue({ autoMarkWrong: false })
    preferencesMocks.savePreferences.mockImplementation(
      async (_userId: string, preferences: unknown) => preferences,
    )
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

  it('changes the reading size from the settings card', async () => {
    const user = userEvent.setup()
    renderSettings()

    expect(screen.getByRole('heading', { name: '閱讀' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '標準' })).toBeChecked()

    await user.click(screen.getByRole('radio', { name: '大' }))

    expect(screen.getByRole('radio', { name: '大' })).toBeChecked()
    expect(localStorage.getItem(readingSizeStorageKey)).toBe('large')
    expect(document.documentElement.dataset.readingSize).toBe('large')
  })

  it('toggles automatic marking of wrong answers', async () => {
    const user = userEvent.setup()
    renderSettings()

    const toggle = await screen.findByRole('switch', { name: '答錯時自動標記' })
    await waitFor(() => expect(toggle).toBeEnabled())
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    preferencesMocks.fetchPreferences.mockResolvedValue({ autoMarkWrong: true })

    await user.click(toggle)

    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'))
    expect(preferencesMocks.savePreferences).toHaveBeenCalledWith('user-1', {
      autoMarkWrong: true,
    })
  })

  it('shows the stored automatic marking setting', async () => {
    preferencesMocks.fetchPreferences.mockResolvedValue({ autoMarkWrong: true })
    renderSettings()

    const toggle = await screen.findByRole('switch', { name: '答錯時自動標記' })
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'))
  })

  it('keeps the switch unchanged when saving fails', async () => {
    const user = userEvent.setup()
    preferencesMocks.savePreferences.mockRejectedValue(
      new Error('無法儲存偏好設定，請稍後再試。'),
    )
    renderSettings()

    const toggle = await screen.findByRole('switch', { name: '答錯時自動標記' })
    await waitFor(() => expect(toggle).toBeEnabled())
    await user.click(toggle)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '無法儲存偏好設定，請稍後再試。',
    )
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'false'))
  })
})
