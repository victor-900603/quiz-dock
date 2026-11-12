import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from './App'
import { mockQuestionsBySet } from './data/mock'

function renderApp(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  )
}

describe('App', () => {
  it('renders the library and navigates between main pages', async () => {
    const user = userEvent.setup()
    renderApp('/')

    expect(await screen.findByRole('heading', { name: '我的題庫' })).toBeInTheDocument()
    expect(screen.getAllByText('生物學基礎').length).toBeGreaterThan(0)

    await user.click(screen.getAllByRole('link', { name: '標記' })[0])
    expect(await screen.findByRole('heading', { name: '已標記題目' })).toBeInTheDocument()

    await user.click(screen.getAllByRole('link', { name: '統計' })[0])
    expect(await screen.findByRole('heading', { name: '學習統計' })).toBeInTheDocument()
    expect(screen.getByText('372')).toBeInTheDocument()

    await user.click(screen.getAllByRole('link', { name: '設定' })[0])
    expect(await screen.findByRole('heading', { name: '設定' })).toBeInTheDocument()
    expect(screen.getAllByText('victor@example.com').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: '登出' }))
    expect(await screen.findByRole('heading', { name: '登入' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '登入' }))
    expect(await screen.findByRole('heading', { name: '設定' })).toBeInTheDocument()
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
            { topic: '測試主題', question: '第一題', options: { A: '甲', B: '乙' }, correct_answers: ['A'] },
          ],
        }),
      },
    })

    expect(await within(dialog).findByLabelText('題庫標題')).toHaveValue('測試題庫')
    expect(within(dialog).getByText('測試主題 · 1')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: '開始匯入' }))
    expect(await screen.findByText('已建立「測試題庫」示範題庫。')).toBeInTheDocument()
    expect(screen.getAllByText('測試題庫').length).toBeGreaterThan(0)
  })

  it('runs a full sequential practice session and shows the summary', async () => {
    const user = userEvent.setup()
    const questions = mockQuestionsBySet['english-collocations']
    const total = questions.length
    renderApp('/practice/demo-session?setId=english-collocations&mode=sequential')

    expect(await screen.findByRole('heading', { name: '英文片語與搭配詞' })).toBeInTheDocument()

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
    renderApp('/practice/session-biology?setId=biology&mode=sequential&resume=1')

    expect(await screen.findByText('第 3 / 20 題')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: '3' })
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(await screen.findByText('答對了')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Enter' })
    expect(await screen.findByText('第 4 / 20 題')).toBeInTheDocument()
  })

  it('opens the navigator, jumps between questions, and hides it while answering', async () => {
    const user = userEvent.setup()
    renderApp('/practice/demo-session?setId=biology&mode=sequential')

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
    await user.click(screen.getByRole('button', { name: '第 1 題，答對' }))
    expect(await screen.findByText('答對了')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /開啟題號列表/ }))
    await user.click(screen.getByRole('button', { name: '隱藏狀態' }))
    expect(screen.queryByText('答對')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '第 1 題' })).toHaveAttribute('aria-current', 'step')

    await user.keyboard('{Escape}')
    expect(screen.getByRole('button', { name: /開啟題號列表/ })).toBeInTheDocument()
  })

  it('uses the practice header and bottom toolbar for question navigation', async () => {
    const user = userEvent.setup()
    renderApp('/practice/demo-session?setId=biology&mode=sequential')

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
    renderApp('/practice/demo-session?setId=biology&mode=sequential')

    expect(await screen.findByText('第 1 / 20 題')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /開啟題號列表/ }))
    expect(screen.getByRole('button', { name: '關閉題號列表' })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: '2' })

    expect(screen.queryByRole('button', { name: '關閉題號列表' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /開啟題號列表/ })).toBeInTheDocument()
  })

  it('supports random mode and multi-answer questions', async () => {
    const user = userEvent.setup()
    const { unmount } = renderApp('/practice/demo-session?setId=biology&mode=random')
    expect((await screen.findAllByText('隨機模式')).length).toBeGreaterThan(0)
    expect(screen.getByLabelText('選項')).toBeInTheDocument()
    unmount()

    renderApp('/practice/demo-session?setId=biology&mode=sequential')
    expect(await screen.findByRole('heading', { name: '生物學基礎' })).toBeInTheDocument()

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

  it('shows the summary fallback when there is no location state', async () => {
    renderApp('/results/demo-session')

    expect(await screen.findByRole('heading', { name: '練習完成' })).toBeInTheDocument()
    expect(screen.getByText('80.0%')).toBeInTheDocument()
    expect(screen.getByText('答對 12 / 已答 15')).toBeInTheDocument()
  })

  it('renames and deletes a quiz set from the detail page', async () => {
    const user = userEvent.setup()
    renderApp('/sets/biology')

    expect(await screen.findByRole('heading', { name: '生物學基礎' })).toBeInTheDocument()

    const randomLink = screen.getByRole('link', { name: '隨機練習' })
    expect(randomLink).toHaveClass('whitespace-nowrap')
    expect(randomLink.parentElement).toHaveClass('grid', 'grid-cols-3', 'sm:flex-nowrap')
    expect(screen.getAllByRole('link', { name: '繼續練習' })).toHaveLength(2)
    expect(screen.getByRole('link', { name: '重新開始' })).toBeInTheDocument()

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
    expect(screen.getAllByLabelText('取消標記')).toHaveLength(10)

    await user.click(screen.getAllByLabelText('取消標記')[0])
    await waitFor(() => expect(screen.getAllByLabelText('取消標記')).toHaveLength(9))

    await user.click(screen.getByRole('button', { name: /光合作用的主要能量來源/ }))
    expect(screen.getByText('解析')).toBeInTheDocument()
    expect(screen.getByText('光合作用利用光能，將二氧化碳與水轉換成葡萄糖並釋放氧氣。')).toBeInTheDocument()
  })

  it('validates login and signup forms', async () => {
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

    const signupEmail = await screen.findByLabelText('Email')
    const signupPassword = screen.getByLabelText('密碼')
    const confirmPassword = screen.getByLabelText('確認密碼')

    await user.type(signupEmail, 'bad')
    fireEvent.submit(signupEmail.closest('form')!)
    expect(screen.getByRole('alert')).toHaveTextContent('請輸入有效的 Email')

    await user.clear(signupEmail)
    await user.type(signupEmail, 'new@example.com')
    await user.type(signupPassword, 'short')
    await user.click(screen.getByRole('button', { name: '建立帳號' }))
    expect(screen.getByRole('alert')).toHaveTextContent('密碼至少 8 碼')

    await user.clear(signupPassword)
    await user.type(signupPassword, 'password123')
    await user.type(confirmPassword, 'different')
    await user.click(screen.getByRole('button', { name: '建立帳號' }))
    expect(screen.getByRole('alert')).toHaveTextContent('兩次輸入的密碼不一致')

    await user.clear(confirmPassword)
    await user.type(confirmPassword, 'password123')
    await user.click(screen.getByRole('button', { name: '建立帳號' }))
    expect(await screen.findByRole('heading', { name: '我的題庫' })).toBeInTheDocument()
  })

  it('handles callback, missing resources, and unknown routes', async () => {
    const { unmount } = renderApp('/auth/callback')
    expect(await screen.findByRole('heading', { name: '我的題庫' })).toBeInTheDocument()
    unmount()

    const second = renderApp('/sets/missing')
    expect(await screen.findByText('找不到題庫')).toBeInTheDocument()
    second.unmount()

    const third = renderApp('/practice/demo-session?setId=missing')
    expect(await screen.findByText('找不到題目')).toBeInTheDocument()
    third.unmount()

    renderApp('/not-a-real-page')
    expect(await screen.findByText('找不到頁面')).toBeInTheDocument()
  })
})
