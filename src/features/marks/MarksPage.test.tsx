import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
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

  it('shows a loading state and renders the marks', async () => {
    renderMarksPage()

    expect(screen.getByText('載入標記中...')).toBeInTheDocument()
    expect(await screen.findAllByLabelText('取消標記')).toHaveLength(10)
    expect(screen.getByText('#001')).toBeInTheDocument()
    expect(screen.getAllByText(/11\/13/).length).toBeGreaterThan(0)
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

  it('expands a question and removes a mark', async () => {
    const user = userEvent.setup()
    renderMarksPage()

    const markButtons = await screen.findAllByLabelText('取消標記')
    await user.click(markButtons[0])
    await waitFor(() => expect(screen.getAllByLabelText('取消標記')).toHaveLength(9))

    await user.click(screen.getByRole('button', { name: /光合作用的主要能量來源/ }))
    expect(screen.getByText('解析')).toBeInTheDocument()
    expect(
      screen.getByText('光合作用利用光能，將二氧化碳與水轉換成葡萄糖並釋放氧氣。'),
    ).toBeInTheDocument()
    expect(screen.getByText('正確答案')).toBeInTheDocument()
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
