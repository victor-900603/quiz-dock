import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import {
  QuestionNavigator,
  type QuestionNavigatorItem,
} from './QuestionNavigator'

const items: QuestionNavigatorItem[] = [
  { id: 'q-1', number: 1, status: 'correct' },
  { id: 'q-2', number: 2, status: 'in-progress' },
  { id: 'q-3', number: 3, status: 'unanswered' },
]

function renderNavigator(overrides: Partial<Parameters<typeof QuestionNavigator>[0]> = {}) {
  const props: Parameters<typeof QuestionNavigator>[0] = {
    items,
    currentIndex: 1,
    answeredCount: 1,
    total: 3,
    showStatus: true,
    onToggleStatus: vi.fn(),
    onJump: vi.fn(),
    ...overrides,
  }

  return { ...render(<QuestionNavigator {...props} />), props }
}

describe('QuestionNavigator', () => {
  it('marks the current question and jumps to a selected number', async () => {
    const user = userEvent.setup()
    const { props } = renderNavigator()

    const current = screen.getByRole('button', { name: '第 2 題，作答中' })
    expect(current).toHaveAttribute('aria-current', 'step')
    expect(current).toHaveClass('ring-inset')
    expect(current).not.toHaveClass('ring-offset-2')
    expect(screen.getByRole('button', { name: '第 1 題，答對' })).toHaveClass('text-correct')
    expect(screen.getByRole('button', { name: '第 3 題，未作答' })).toHaveClass('text-muted')

    await user.click(screen.getByRole('button', { name: '第 3 題，未作答' }))
    expect(props.onJump).toHaveBeenCalledWith(2)
  })

  it('hides status colors and labels when status is turned off', async () => {
    const user = userEvent.setup()
    const { props, rerender } = renderNavigator()

    await user.click(screen.getByRole('button', { name: '隱藏狀態' }))
    expect(props.onToggleStatus).toHaveBeenCalledTimes(1)
    expect(screen.getByText('答對')).toBeInTheDocument()

    rerender(<QuestionNavigator {...props} showStatus={false} />)

    expect(screen.queryByText('答對')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '第 1 題' })).not.toHaveClass('text-correct')
    expect(screen.getByRole('button', { name: '第 2 題' })).toHaveClass('text-accent')
    expect(screen.getByRole('button', { name: '顯示狀態' })).toBeInTheDocument()
  })

  it('collapses and expands the question list', async () => {
    const user = userEvent.setup()
    renderNavigator()

    const toggle = screen.getByRole('button', { name: /題號列表/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('navigation', { name: '題號列表' })).toBeInTheDocument()

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('navigation', { name: '題號列表' })).not.toBeInTheDocument()

    await user.click(toggle)
    expect(screen.getByRole('navigation', { name: '題號列表' })).toBeInTheDocument()
  })

  it('shows the dock list immediately and closes after jumping or pressing close', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { props } = renderNavigator({ variant: 'dock', onClose })

    expect(screen.getByRole('navigation', { name: '題號列表' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '第 3 題，未作答' }))
    expect(props.onJump).toHaveBeenCalledWith(2)
    expect(onClose).toHaveBeenCalledTimes(1)

    onClose.mockClear()
    await user.click(screen.getByRole('button', { name: '關閉題號列表' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes the dock with Escape while focus is inside', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderNavigator({ variant: 'dock', onClose })

    screen.getByRole('button', { name: '關閉題號列表' }).focus()
    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
