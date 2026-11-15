import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TestAuthProvider } from '../../test/TestAuthProvider'
import { getSharedFakeSupabase } from '../../test/fakeSupabase'
import { SetQuestionsPage } from './SetQuestionsPage'

vi.mock('../../lib/supabase', async () => {
  const { getSharedFakeSupabase: getFake } = await import('../../test/fakeSupabase')
  return { supabase: getFake() }
})

function renderPage(path = '/sets/biology/questions') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <TestAuthProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/sets/:setId/questions" element={<SetQuestionsPage />} />
          </Routes>
        </MemoryRouter>
      </TestAuthProvider>
    </QueryClientProvider>,
  )
}

describe('SetQuestionsPage', () => {
  beforeEach(() => {
    getSharedFakeSupabase().reset()
  })

  it('shows the set header and the question browser', async () => {
    const fake = getSharedFakeSupabase()
    const total = fake.tables.questions.filter((row) => row.set_id === 'biology').length

    renderPage()

    expect(screen.getByText('載入題庫中...')).toBeInTheDocument()

    expect(
      await screen.findByRole('heading', { level: 1, name: '生物學基礎' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /回題庫詳情/ })).toHaveAttribute(
      'href',
      '/sets/biology',
    )
    expect(
      screen.getByText(`共 ${total} 題，可搜尋題幹、選項或解析，展開後查看答案與解析。`),
    ).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: '搜尋題目' })).toBeInTheDocument()
    expect(
      await screen.findByText(`顯示 ${Math.min(total, 20)} / ${total} 題`),
    ).toBeInTheDocument()
  })

  it('shows which visible questions are marked', async () => {
    renderPage()

    expect(await screen.findAllByText('已標記')).not.toHaveLength(0)
  })

  it('shows a load error and retries', async () => {
    const user = userEvent.setup()
    getSharedFakeSupabase().failNextSelect('quiz_sets', { message: 'Failed to fetch' })

    renderPage()

    expect(
      await screen.findByText('無法連線到伺服器，請檢查網路後再試一次。'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '重新載入' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: '生物學基礎' }),
    ).toBeInTheDocument()
  })

  it('shows the missing state when the set does not exist', async () => {
    renderPage('/sets/missing/questions')

    expect(await screen.findByText('找不到題庫')).toBeInTheDocument()
    expect(screen.getByText('這個題庫不存在，或已經被移除。')).toBeInTheDocument()
  })
})
