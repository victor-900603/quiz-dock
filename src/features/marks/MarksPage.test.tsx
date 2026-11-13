import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TestAuthProvider } from '../../test/TestAuthProvider'
import { getSharedFakeSupabase } from '../../test/fakeSupabase'
import { MarksPage } from './MarksPage'

vi.mock('../../lib/supabase', async () => {
  const { getSharedFakeSupabase: getFake } = await import('../../test/fakeSupabase')
  return { supabase: getFake() }
})

function renderMarksPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <TestAuthProvider>
        <MemoryRouter>
          <MarksPage />
        </MemoryRouter>
      </TestAuthProvider>
    </QueryClientProvider>,
  )
}

describe('MarksPage', () => {
  beforeEach(() => {
    getSharedFakeSupabase().reset()
  })

  it('shows a loading skeleton and groups the marks by set', async () => {
    renderMarksPage()

    const loading = screen.getByRole('status')
    expect(loading).toHaveAttribute('aria-busy', 'true')
    expect(within(loading).getByText('載入標記中...')).toBeInTheDocument()

    expect(await screen.findAllByLabelText('取消標記')).toHaveLength(10)
    expect(screen.getByText('共 10 題標記，來自 4 個題庫。')).toBeInTheDocument()

    const biology = screen.getByRole('group', { name: '生物學基礎' })
    expect(within(biology).getByText('3 題')).toBeInTheDocument()
    expect(within(biology).getByText('#001')).toBeInTheDocument()

    const history = screen.getByRole('group', { name: '台灣史綱要' })
    expect(within(history).getByText('3 題')).toBeInTheDocument()

    expect(screen.getByRole('group', { name: '英文片語與搭配詞' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: '計算機概論' })).toBeInTheDocument()

    const markedTimes = document.querySelectorAll('time[datetime]')
    expect(markedTimes).toHaveLength(10)
    expect(
      document.querySelector('time[datetime="2026-11-13T09:35:00.000Z"]'),
    ).toBeInTheDocument()
  })

  it('shows the empty state', async () => {
    getSharedFakeSupabase().reset({ question_marks: [] })
    renderMarksPage()

    expect(await screen.findByText('還沒有標記題目')).toBeInTheDocument()
    expect(screen.getByText('練習時點星號即可加入。')).toBeInTheDocument()
  })

  it('shows a load error and retries', async () => {
    const user = userEvent.setup()
    getSharedFakeSupabase().failNextSelect('question_marks', {
      message: 'Failed to fetch',
    })
    renderMarksPage()

    expect(
      await screen.findByText('無法連線到伺服器，請檢查網路後再試一次。'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '重新載入' }))
    expect(await screen.findAllByLabelText('取消標記')).toHaveLength(10)
  })

  it('expands a question, shows the answer, and collapses it again', async () => {
    const user = userEvent.setup()
    renderMarksPage()

    const toggle = await screen.findByRole('button', {
      name: /光合作用的主要能量來源/,
    })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    const panelId = toggle.getAttribute('aria-controls')
    expect(panelId).toBeTruthy()
    expect(document.getElementById(panelId as string)).not.toBeInTheDocument()

    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle).toHaveTextContent('收合')

    const panel = document.getElementById(panelId as string)
    expect(panel).not.toBeNull()
    expect(within(panel as HTMLElement).getByText('解析')).toBeInTheDocument()
    expect(
      within(panel as HTMLElement).getByText(
        '光合作用利用光能，將二氧化碳與水轉換成葡萄糖並釋放氧氣。',
      ),
    ).toBeInTheDocument()
    expect(within(panel as HTMLElement).getByText('正確答案')).toBeInTheDocument()

    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById(panelId as string)).not.toBeInTheDocument()
  })

  it('removes a mark and updates the group counts', async () => {
    const user = userEvent.setup()
    renderMarksPage()

    const markButtons = await screen.findAllByLabelText('取消標記')
    await user.click(markButtons[0])
    await waitFor(() => expect(screen.getAllByLabelText('取消標記')).toHaveLength(9))

    expect(screen.getByText('共 9 題標記，來自 4 個題庫。')).toBeInTheDocument()
    const biology = screen.getByRole('group', { name: '生物學基礎' })
    expect(within(biology).getByText('2 題')).toBeInTheDocument()
  })

  it('rolls back and reports an error when removing a mark fails', async () => {
    const user = userEvent.setup()
    getSharedFakeSupabase().failNextAction('question_marks', 'delete', {
      message: 'Failed to fetch',
    })
    renderMarksPage()

    const markButtons = await screen.findAllByLabelText('取消標記')
    await user.click(markButtons[0])

    expect(await screen.findByText('標記失敗，請再試一次')).toBeInTheDocument()
    await waitFor(() => expect(screen.getAllByLabelText('取消標記')).toHaveLength(10))
  })
})
