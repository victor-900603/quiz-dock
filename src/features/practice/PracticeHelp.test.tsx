import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PracticeHelpButton, PracticeHelpDialog } from './PracticeHelp'

describe('PracticeHelpButton', () => {
  it('calls onClick when pressed', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(<PracticeHelpButton onClick={onClick} />)

    const button = screen.getByRole('button', { name: '練習說明' })
    expect(button).toHaveAttribute('title', '練習說明')

    await user.click(button)

    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('PracticeHelpDialog', () => {
  it('shows grouped answering and navigation tips', () => {
    render(<PracticeHelpDialog open onClose={vi.fn()} />)

    expect(screen.getByRole('dialog', { name: '練習說明' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '作答' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '換題與進度' })).toBeInTheDocument()
    expect(screen.getByText('選擇對應選項。')).toBeInTheDocument()
    expect(
      screen.getByText('送出答案；已送出時再按一次前往下一題。'),
    ).toBeInTheDocument()
    expect(screen.getByText('切換上一題或下一題。')).toBeInTheDocument()
    expect(screen.getByText('使用題號工具列或題號列表跳到任一題。')).toBeInTheDocument()
    expect(screen.getByText('離開後進度會保留。')).toBeInTheDocument()
  })

  it('closes from the footer button', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(<PracticeHelpDialog open onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: '知道了' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes with Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(<PracticeHelpDialog open onClose={onClose} />)

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders nothing while closed', () => {
    render(<PracticeHelpDialog open={false} onClose={vi.fn()} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
