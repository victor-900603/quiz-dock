import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from './AppRoutes'
import { mockQuestionsBySet } from './data/mock'
import { TestAuthProvider } from './test/TestAuthProvider'
import { createSeedTables, getSharedFakeSupabase } from './test/fakeSupabase'

vi.mock('./lib/supabase', async () => {
  const { getSharedFakeSupabase } = await import('./test/fakeSupabase')
  return { supabase: getSharedFakeSupabase() }
})

function renderApp(route = '/') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <TestAuthProvider>
        <MemoryRouter initialEntries={[route]}>
          <AppRoutes />
        </MemoryRouter>
      </TestAuthProvider>
    </QueryClientProvider>,
  )
}

function resetWithoutPractice() {
  const seed = createSeedTables()
  seed.practice_sessions = []
  seed.attempts = []
  getSharedFakeSupabase().reset(seed)
}

describe('App', () => {
  beforeEach(() => {
    getSharedFakeSupabase().reset()
  })

  it('renders the library and navigates between main pages', async () => {
    const user = userEvent.setup()
    renderApp('/')

    expect(await screen.findByRole('heading', { name: '我的題庫' })).toBeInTheDocument()
    expect((await screen.findAllByText('生物學基礎')).length).toBeGreaterThan(0)
    expect(await screen.findByText('已答 2 / 20 題')).toBeInTheDocument()

    await user.click(screen.getAllByRole('link', { name: '標記' })[0])
    expect(await screen.findByRole('heading', { name: '已標記題目' })).toBeInTheDocument()

    await user.click(screen.getAllByRole('link', { name: '統計' })[0])
    expect(await screen.findByRole('heading', { name: '學習統計' })).toBeInTheDocument()
    expect(await screen.findByText('答對 2 題')).toBeInTheDocument()

    await user.click(screen.getAllByRole('link', { name: '設定' })[0])
    expect(await screen.findByRole('heading', { name: '設定' })).toBeInTheDocument()
    expect(screen.getAllByText('victor@example.com').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: '登出' }))
    expect(await screen.findByRole('heading', { name: '登入' })).toBeInTheDocument()

    await user.type(screen.getByLabelText('Email'), 'victor@example.com')
    await user.type(screen.getByLabelText('密碼'), 'password')
    await user.click(screen.getByRole('button', { name: '登入' }))
    expect(await screen.findByRole('heading', { name: '我的題庫' })).toBeInTheDocument()
  })

  it('shows statistics from the Supabase views', async () => {
    renderApp('/stats')

    expect(await screen.findByRole('heading', { name: '學習統計' })).toBeInTheDocument()
    expect(await screen.findByText('答對 2 題')).toBeInTheDocument()
    expect(await screen.findByText('2 / 2 題')).toBeInTheDocument()
    expect(screen.getAllByText('生物學基礎').length).toBeGreaterThan(0)
    expect(screen.getByText('細胞結構')).toBeInTheDocument()
    expect(screen.getByText('遺傳學')).toBeInTheDocument()
    expect(screen.getByText('最近 14 天活動')).toBeInTheDocument()
    expect(screen.getByText(/進行中/)).toBeInTheDocument()
  })

  it('shows an empty statistics state without attempts', async () => {
    const seed = createSeedTables()
    seed.attempts = []
    seed.practice_sessions = []
    getSharedFakeSupabase().reset(seed)

    renderApp('/stats')

    expect(
      await screen.findByText('完成第一場練習後，這裡會顯示統計。'),
    ).toBeInTheDocument()
  })

  it('shows empty and error states for the library', async () => {
    const user = userEvent.setup()
    getSharedFakeSupabase().reset({ quiz_sets: [], questions: [] })

    const empty = renderApp('/')
    expect(await screen.findByText('還沒有題庫')).toBeInTheDocument()
    empty.unmount()

    getSharedFakeSupabase().reset()
    getSharedFakeSupabase().failNextSelect('quiz_sets', { message: 'Failed to fetch' })
    renderApp('/')

    expect(
      await screen.findByText('無法連線到伺服器，請檢查網路後再試一次。'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '重新載入' }))
    expect((await screen.findAllByText('生物學基礎')).length).toBeGreaterThan(0)
  })

  it('shows a load error for a set and retries', async () => {
    const user = userEvent.setup()
    getSharedFakeSupabase().failNextSelect('quiz_sets', {
      message: 'row-level security',
    })

    renderApp('/sets/biology')

    expect(
      await screen.findByText('沒有權限執行此操作，請重新登入後再試一次。'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '重新載入' }))
    expect(await screen.findByRole('heading', { name: '生物學基礎' })).toBeInTheDocument()
  })

  it('imports a pasted JSON set and shows the preview notice', async () => {
    const user = userEvent.setup()
    renderApp('/')

    await user.click(await screen.findByRole('button', { name: '匯入題庫' }))
    const dialog = await screen.findByRole('dialog', { name: '匯入題庫' })

    await user.click(within(dialog).getByRole('tab', { name: '貼上 JSON' }))
    fireEvent.change(within(dialog).getByLabelText('JSON 內容'), {
      target: {
        value: JSON.stringify({
          title: '測試題庫',
          description: '匯入測試',
          questions: [
            {
              topic: '測試主題',
              question: '第一題',
              options: { A: '甲', B: '乙' },
              correct_answers: ['A'],
            },
          ],
        }),
      },
    })

    expect(await within(dialog).findByLabelText('題庫標題')).toHaveValue('測試題庫')
    expect(within(dialog).getByText('測試主題 · 1')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: '開始匯入' }))
    expect(await screen.findByText('已匯入「測試題庫」。')).toBeInTheDocument()
    expect(screen.getAllByText('測試題庫').length).toBeGreaterThan(0)
  })

  it('starts a sequential practice and shows the summary', async () => {
    const user = userEvent.setup()
    const questions = mockQuestionsBySet['english-collocations']
    const total = questions.length
    renderApp('/sets/english-collocations')

    expect(await screen.findByRole('heading', { name: '英文片語與搭配詞' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '依序練習' }))
    expect(await screen.findByText(`第 1 / ${total} 題`)).toBeInTheDocument()

    for (const [index, item] of questions.entries()) {
      const answer = item.correctAnswers[0]
      const option = await screen.findByRole('radio', { name: new RegExp(`^${answer}`) })
      await user.click(option)
      await user.click(screen.getByRole('button', { name: '確認答案' }))
      expect(await screen.findByText('答對了')).toBeInTheDocument()

      const action = index === total - 1 ? '查看摘要' : '下一題'
      await user.click(screen.getByRole('button', { name: action }))

      if (index < total - 1) {
        expect(await screen.findByText(`第 ${index + 2} / ${total} 題`)).toBeInTheDocument()
      }
    }

    expect(await screen.findByRole('heading', { name: '練習完成' })).toBeInTheDocument()
    expect(screen.getAllByText('100.0%').length).toBeGreaterThan(0)
    expect(screen.getByText(`答對 ${total} / 已答 ${total}`)).toBeInTheDocument()
  })

  it('resumes a session and supports keyboard answering', async () => {
    renderApp('/practice/session-biology?setId=biology&mode=sequential')

    expect(await screen.findByText('第 3 / 20 題')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: '3' })
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(await screen.findByText('答對了')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Enter' })
    expect(await screen.findByText('第 4 / 20 題')).toBeInTheDocument()
  })

  it('opens the navigator, jumps between questions, and hides it while answering', async () => {
    const user = userEvent.setup()
    resetWithoutPractice()
    renderApp('/sets/biology')

    expect(await screen.findByRole('heading', { name: '生物學基礎' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '依序練習' }))
    expect(await screen.findByText('第 1 / 20 題')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '關閉題號列表' })).not.toBeInTheDocument()

    await user.click(await screen.findByRole('radio', { name: /^B/ }))
    await user.click(screen.getByRole('button', { name: '確認答案' }))
    expect(await screen.findByText('答對了')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /開啟題號列表/ }))
    await user.click(screen.getByRole('button', { name: '第 4 題，未作答' }))
    expect(
      await screen.findByRole('heading', { name: '下列哪一項屬於生產者？' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '關閉題號列表' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /開啟題號列表/ }))
    await user.click(screen.getByRole('button', { name: '第 1 題，答對，已標記' }))
    expect(await screen.findByText('答對了')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /開啟題號列表/ }))
    await user.click(screen.getByRole('button', { name: '隱藏狀態' }))
    expect(screen.getByRole('button', { name: '第 1 題，已標記' })).toHaveAttribute(
      'aria-current',
      'step',
    )

    await user.keyboard('{Escape}')
    expect(screen.getByRole('button', { name: /開啟題號列表/ })).toBeInTheDocument()
  })

  it('uses the practice header and bottom toolbar for question navigation', async () => {
    const user = userEvent.setup()
    resetWithoutPractice()
    renderApp('/sets/biology')

    expect(await screen.findByRole('heading', { name: '生物學基礎' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '依序練習' }))
    expect(await screen.findByText('第 1 / 20 題')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '返回題庫' })).toBeInTheDocument()
    expect(screen.getAllByText('生物學基礎').length).toBeGreaterThan(0)
    const toolbar = screen.getByRole('navigation', { name: '答題工具列' })
    expect(toolbar).toBeInTheDocument()
    expect(toolbar).toHaveClass('border-t')
    expect(screen.getByRole('button', { name: /展開題號列表/ })).toHaveTextContent(/^題號$/)

    const previous = screen.getByRole('button', { name: '切換到上一題' })
    const next = screen.getByRole('button', { name: '切換到下一題' })
    expect(previous).toBeDisabled()
    expect(next).toBeEnabled()

    await user.click(next)
    expect(await screen.findByText('第 2 / 20 題')).toBeInTheDocument()
    expect(previous).toBeEnabled()

    await user.click(previous)
    expect(await screen.findByText('第 1 / 20 題')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /展開題號列表/ }))
    expect(screen.getByRole('button', { name: '關閉題號列表' })).toBeInTheDocument()
    expect(toolbar).toHaveClass('border-t-0')
    expect(toolbar).not.toHaveClass('border-t')

    const panel = document.getElementById('question-navigator-panel')
    expect(panel).toHaveClass('inset-x-0')
    expect(panel).not.toHaveClass('px-4')

    await user.click(screen.getByRole('button', { name: '第 4 題，未作答' }))
    expect(
      await screen.findByRole('heading', { name: '下列哪一項屬於生產者？' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '關閉題號列表' })).not.toBeInTheDocument()
    expect(toolbar).toHaveClass('border-t')
    expect(toolbar).not.toHaveClass('border-t-0')
  })

  it('closes the navigator when answering with the keyboard', async () => {
    resetWithoutPractice()
    renderApp('/sets/biology')

    expect(await screen.findByRole('heading', { name: '生物學基礎' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '依序練習' }))
    expect(await screen.findByText('第 1 / 20 題')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /開啟題號列表/ }))
    expect(screen.getByRole('button', { name: '關閉題號列表' })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: '2' })

    expect(screen.queryByRole('button', { name: '關閉題號列表' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /開啟題號列表/ })).toBeInTheDocument()
  })

  it('supports random mode and multi-answer questions', async () => {
    const user = userEvent.setup()
    resetWithoutPractice()
    const { unmount } = renderApp('/sets/biology')

    expect(await screen.findByRole('heading', { name: '生物學基礎' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '隨機練習' }))
    expect(await screen.findByText('第 1 / 20 題')).toBeInTheDocument()
    expect((await screen.findAllByText('隨機模式')).length).toBeGreaterThan(0)
    expect(screen.getByLabelText('選項')).toBeInTheDocument()
    unmount()

    resetWithoutPractice()
    renderApp('/sets/biology')
    expect(await screen.findByRole('heading', { name: '生物學基礎' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '依序練習' }))
    expect(await screen.findByText('第 1 / 20 題')).toBeInTheDocument()

    const answers = ['B', 'B', 'C', 'B']
    for (const answer of answers) {
      await user.click(await screen.findByRole('radio', { name: new RegExp(`^${answer}`) }))
      await user.click(screen.getByRole('button', { name: '確認答案' }))
      expect(await screen.findByText('答對了')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: '下一題' }))
    }

    expect(await screen.findByText('選出所有正確答案')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^A/ }))
    await user.click(screen.getByRole('button', { name: /^B/ }))
    await user.click(screen.getByRole('button', { name: /^D/ }))
    await user.click(screen.getByRole('button', { name: '確認答案' }))
    expect(await screen.findByText('答對了')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '下一題' }))
    expect(await screen.findByText('第 6 / 20 題')).toBeInTheDocument()
  })

  it('starts practice from a library card', async () => {
    const user = userEvent.setup()
    resetWithoutPractice()
    renderApp('/')

    const titleLink = await screen.findByRole('link', { name: '英文片語與搭配詞' })
    const card = titleLink.closest('.rounded-xl')
    expect(card).not.toBeNull()

    await user.click(
      within(card as HTMLElement).getByRole('button', { name: '開始練習' }),
    )

    expect(await screen.findByText('第 1 / 20 題')).toBeInTheDocument()
    expect(screen.getAllByText('英文片語與搭配詞').length).toBeGreaterThan(0)
  })

  it('shows a summary from stored attempts when opening results directly', async () => {
    renderApp('/results/session-biology')

    expect(await screen.findByRole('heading', { name: '練習完成' })).toBeInTheDocument()
    expect(screen.getAllByText('100.0%').length).toBeGreaterThan(0)
    expect(screen.getByText('答對 2 / 已答 2')).toBeInTheDocument()
    expect(screen.getByText('27 秒')).toBeInTheDocument()
  })

  it('renames and deletes a quiz set from the detail page', async () => {
    const user = userEvent.setup()
    renderApp('/sets/biology')

    expect(await screen.findByRole('heading', { name: '生物學基礎' })).toBeInTheDocument()

    const randomButton = screen.getByRole('button', { name: '隨機練習' })
    expect(randomButton).toHaveClass('whitespace-nowrap')
    expect(randomButton.parentElement).toHaveClass('grid', 'grid-cols-3', 'sm:flex-nowrap')
    expect(screen.getAllByRole('link', { name: /繼續練習/ }).length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: '重新命名' }))
    const renameDialog = await screen.findByRole('dialog', { name: '重新命名題庫' })
    const titleInput = within(renameDialog).getByLabelText('題庫標題')
    fireEvent.change(titleInput, { target: { value: '生物學進階' } })
    expect(titleInput).toHaveValue('生物學進階')
    await user.click(within(renameDialog).getByRole('button', { name: '儲存' }))

    expect(await screen.findByRole('heading', { name: '生物學進階' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '刪除題庫' }))
    const deleteDialog = await screen.findByRole('dialog', { name: '刪除題庫' })
    await user.click(within(deleteDialog).getByRole('button', { name: '刪除' }))

    expect(await screen.findByRole('heading', { name: '我的題庫' })).toBeInTheDocument()
    expect(screen.queryByText('生物學進階')).not.toBeInTheDocument()
  })

  it('expands and removes marks', async () => {
    const user = userEvent.setup()
    renderApp('/marks')

    expect(await screen.findByRole('heading', { name: '已標記題目' })).toBeInTheDocument()
    expect(await screen.findAllByLabelText('取消標記')).toHaveLength(10)

    await user.click(screen.getAllByLabelText('取消標記')[0])
    await waitFor(() => expect(screen.getAllByLabelText('取消標記')).toHaveLength(9))

    await user.click(screen.getByRole('button', { name: /光合作用的主要能量來源/ }))
    expect(screen.getByText('解析')).toBeInTheDocument()
    expect(screen.getByText('光合作用利用光能，將二氧化碳與水轉換成葡萄糖並釋放氧氣。')).toBeInTheDocument()
  })

  it('toggles marks from practice and lists them on the marks page', async () => {
    const user = userEvent.setup()
    renderApp('/practice/session-biology?setId=biology&mode=sequential')

    expect(await screen.findByText('第 3 / 20 題')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: '取消標記' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '切換到下一題' }))
    expect(await screen.findByText('第 4 / 20 題')).toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: '標記題目' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '取消標記' })).toBeInTheDocument(),
    )

    await user.click(screen.getByRole('button', { name: /展開題號列表/ }))
    expect(
      screen.getByRole('button', { name: '第 4 題，未作答，已標記' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '第 3 題，未作答，已標記' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '第 2 題，答對' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '關閉題號列表' }))
    expect(screen.queryByRole('button', { name: '關閉題號列表' })).not.toBeInTheDocument()

    await user.click(screen.getAllByRole('link', { name: '標記' })[0])
    expect(await screen.findByRole('heading', { name: '已標記題目' })).toBeInTheDocument()
    expect(await screen.findAllByLabelText('取消標記')).toHaveLength(11)
    expect(screen.getByText('下列哪一項屬於生產者？')).toBeInTheDocument()
  })

  it('filters the practice navigator by marked questions', async () => {
    const user = userEvent.setup()
    renderApp('/practice/session-biology?setId=biology&mode=sequential')

    expect(await screen.findByText('第 3 / 20 題')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /展開題號列表/ }))
    const filterGroup = screen.getByRole('group', { name: '題目篩選' })
    const markedChip = within(filterGroup).getByRole('button', { name: '已標記 3' })
    expect(markedChip).toHaveAttribute('aria-pressed', 'false')

    await user.click(markedChip)

    expect(markedChip).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '第 1 題，答對，已標記' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '第 3 題，未作答，已標記' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '第 5 題，未作答，已標記' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '第 2 題，答對' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '關閉題號列表' }))
    await user.click(screen.getByRole('button', { name: /展開題號列表/ }))

    const reopenedGroup = screen.getByRole('group', { name: '題目篩選' })
    expect(within(reopenedGroup).getByRole('button', { name: '已標記 3' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.queryByRole('button', { name: '第 2 題，答對' })).not.toBeInTheDocument()
  })

  it('allows changing an answer and updates the navigator status', async () => {
    const user = userEvent.setup()
    resetWithoutPractice()
    renderApp('/sets/biology')

    expect(await screen.findByRole('heading', { name: '生物學基礎' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '依序練習' }))
    expect(await screen.findByText('第 1 / 20 題')).toBeInTheDocument()

    await user.click(await screen.findByRole('radio', { name: /^B/ }))
    await user.click(screen.getByRole('button', { name: '確認答案' }))
    expect(await screen.findByText('答對了')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '修改答案' }))
    expect(screen.getByRole('button', { name: '更新答案' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '取消修改' })).toBeInTheDocument()
    expect(screen.queryByText('答對了')).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: /^A/ }))
    await user.click(screen.getByRole('button', { name: '更新答案' }))
    expect(await screen.findByText('答錯了')).toBeInTheDocument()
    expect(await screen.findByText('答案已更新。')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /展開題號列表/ }))
    expect(screen.getByRole('button', { name: '第 1 題，答錯，已標記' })).toBeInTheDocument()
  })

  it('shows an error when submitting an answer fails', async () => {
    const user = userEvent.setup()
    resetWithoutPractice()
    renderApp('/sets/biology')

    expect(await screen.findByRole('heading', { name: '生物學基礎' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '依序練習' }))
    expect(await screen.findByText('第 1 / 20 題')).toBeInTheDocument()

    getSharedFakeSupabase().failNextRpc('submit_answer', {
      message: 'Failed to fetch',
    })

    await user.click(await screen.findByRole('radio', { name: /^B/ }))
    await user.click(screen.getByRole('button', { name: '確認答案' }))

    expect(
      await screen.findByText('無法連線到伺服器，請檢查網路後再試一次。'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '確認答案' })).toBeEnabled()
  })

  it('restarts from the results page and clears progress', async () => {
    const user = userEvent.setup()
    renderApp('/results/session-biology')

    expect(await screen.findByRole('heading', { name: '練習完成' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '重新開始' }))

    const dialog = await screen.findByRole('dialog', { name: '重新開始' })
    await user.click(within(dialog).getByRole('button', { name: '重新開始' }))

    expect(await screen.findByText('第 1 / 20 題')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /展開題號列表/ })).toHaveAttribute(
      'aria-label',
      expect.stringContaining('已答 0 / 20'),
    )
  })

  it('confirms before switching practice mode and clears attempts', async () => {
    const user = userEvent.setup()
    renderApp('/sets/biology')

    expect(await screen.findByRole('heading', { name: '生物學基礎' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '隨機練習' }))

    const dialog = await screen.findByRole('dialog', { name: '切換模式' })
    await user.click(within(dialog).getByRole('button', { name: '切換模式' }))

    expect(await screen.findByText('第 1 / 20 題')).toBeInTheDocument()
    expect((await screen.findAllByText('隨機模式')).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /展開題號列表/ })).toHaveAttribute(
      'aria-label',
      expect.stringContaining('已答 0 / 20'),
    )
  })

  it('validates login and hides signup', async () => {
    const user = userEvent.setup()
    const { unmount } = renderApp('/login')

    const email = await screen.findByLabelText('Email')
    const password = screen.getByLabelText('密碼')
    await user.clear(email)
    await user.type(email, 'bad')
    fireEvent.submit(email.closest('form')!)
    expect(screen.getByRole('alert')).toHaveTextContent('請輸入有效的 Email')

    await user.clear(email)
    await user.type(email, 'user@example.com')
    await user.clear(password)
    await user.type(password, 'short')
    await user.click(screen.getByRole('button', { name: '登入' }))
    expect(screen.getByRole('alert')).toHaveTextContent('密碼至少 8 碼')

    await user.clear(password)
    await user.type(password, 'password123')
    await user.click(screen.getByRole('button', { name: '登入' }))
    expect(await screen.findByRole('heading', { name: '我的題庫' })).toBeInTheDocument()

    unmount()
    renderApp('/signup')

    expect(await screen.findByRole('heading', { name: '登入' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /註冊/ })).not.toBeInTheDocument()
  })

  it('handles callback, missing resources, and unknown routes', async () => {
    const { unmount } = renderApp('/auth/callback')
    expect(await screen.findByRole('heading', { name: '我的題庫' })).toBeInTheDocument()
    unmount()

    const second = renderApp('/sets/missing')
    expect(await screen.findByText('找不到題庫')).toBeInTheDocument()
    second.unmount()

    const third = renderApp('/practice/missing-session?setId=missing')
    expect(await screen.findByText('找不到練習')).toBeInTheDocument()
    third.unmount()

    const fourth = renderApp('/results/missing-session')
    expect(await screen.findByText('找不到練習摘要')).toBeInTheDocument()
    fourth.unmount()

    renderApp('/not-a-real-page')
    expect(await screen.findByText('找不到頁面')).toBeInTheDocument()
  })
})
