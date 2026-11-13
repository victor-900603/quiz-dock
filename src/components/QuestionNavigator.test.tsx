import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import {
  QuestionNavigator,
  type QuestionNavigatorItem,
} from './QuestionNavigator'

const items: QuestionNavigatorItem[] = [
  { id: 'q-1', number: 1, status: 'correct', marked: true },
  { id: 'q-2', number: 2, status: 'in-progress', marked: false },
  { id: 'q-3', number: 3, status: 'unanswered', marked: false },
]

const filterItems: QuestionNavigatorItem[] = [
  { id: 'f-1', number: 1, status: 'correct', marked: true },
  { id: 'f-2', number: 2, status: 'in-progress', marked: false },
  { id: 'f-3', number: 3, status: 'unanswered', marked: false },
  { id: 'f-4', number: 4, status: 'wrong', marked: true },
  { id: 'f-5', number: 5, status: 'unanswered', marked: false },
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
    expect(screen.getByRole('button', { name: '第 1 題，答對，已標記' })).toHaveClass(
      'text-correct',
    )
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
    expect(screen.getByRole('button', { name: '第 1 題，已標記' })).not.toHaveClass(
      'text-correct',
    )
    expect(screen.getByRole('button', { name: '第 2 題' })).toHaveClass('text-accent')
    expect(screen.getByRole('button', { name: '顯示狀態' })).toBeInTheDocument()
  })

  it('shows a star on marked questions and keeps it visible when status is hidden', () => {
    const { props, rerender } = renderNavigator()

    const marked = screen.getByRole('button', { name: '第 1 題，答對，已標記' })
    const star = marked.querySelector('svg')
    expect(star).toHaveAttribute('fill', 'currentColor')
    expect(star).toHaveClass('text-highlight')
    expect(screen.getByRole('button', { name: '第 2 題，作答中' }).querySelector('svg')).toBeNull()
    expect(screen.getByText('已標記')).toBeInTheDocument()

    rerender(<QuestionNavigator {...props} showStatus={false} />)

    const hiddenMarked = screen.getByRole('button', { name: '第 1 題，已標記' })
    expect(hiddenMarked.querySelector('svg')).toHaveAttribute('fill', 'currentColor')
    expect(screen.getByText('已標記')).toBeInTheDocument()
    expect(screen.queryByText('答對')).not.toBeInTheDocument()
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

  it('keeps the inline navigator unchanged when filter props are omitted', () => {
    renderNavigator()

    expect(screen.queryByRole('group', { name: '題目篩選' })).not.toBeInTheDocument()
  })

  it('renders filter chips with counts and aria-pressed state', () => {
    renderNavigator({
      items: filterItems,
      total: 5,
      filter: 'marked',
      onFilterChange: vi.fn(),
    })

    const group = screen.getByRole('group', { name: '題目篩選' })
    const expectedChips = [
      ['全部 5', 'false'],
      ['已標記 2', 'true'],
      ['未作答 3', 'false'],
      ['答錯 1', 'false'],
      ['答對 1', 'false'],
    ] as const

    for (const [name, pressed] of expectedChips) {
      expect(within(group).getByRole('button', { name })).toHaveAttribute(
        'aria-pressed',
        pressed,
      )
    }
  })

  it('reports filter chip changes', async () => {
    const user = userEvent.setup()
    const onFilterChange = vi.fn()
    renderNavigator({
      items: filterItems,
      total: 5,
      filter: 'all',
      onFilterChange,
    })

    await user.click(screen.getByRole('button', { name: '答錯 1' }))

    expect(onFilterChange).toHaveBeenCalledWith('wrong')
  })

  it('shows only the questions that match each filter', () => {
    const onFilterChange = vi.fn()
    const { props, rerender } = renderNavigator({
      items: filterItems,
      total: 5,
      filter: 'all',
      onFilterChange,
    })

    function visibleQuestionLabels() {
      return within(screen.getByRole('navigation', { name: '題號列表' }))
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label'))
    }

    expect(visibleQuestionLabels()).toEqual([
      '第 1 題，答對，已標記',
      '第 2 題，作答中',
      '第 3 題，未作答',
      '第 4 題，答錯，已標記',
      '第 5 題，未作答',
    ])

    const filterCases = [
      ['marked', ['第 1 題，答對，已標記', '第 4 題，答錯，已標記']],
      ['unanswered', ['第 2 題，作答中', '第 3 題，未作答', '第 5 題，未作答']],
      ['wrong', ['第 4 題，答錯，已標記']],
      ['correct', ['第 1 題，答對，已標記']],
    ] as const

    for (const [filter, expectedLabels] of filterCases) {
      rerender(
        <QuestionNavigator {...props} filter={filter} onFilterChange={onFilterChange} />,
      )

      expect(visibleQuestionLabels()).toEqual(expectedLabels)
    }
  })

  it('jumps with the original question index after filtering', async () => {
    const user = userEvent.setup()
    const { props } = renderNavigator({
      items: filterItems,
      total: 5,
      filter: 'marked',
      onFilterChange: vi.fn(),
    })

    await user.click(screen.getByRole('button', { name: '第 4 題，答錯，已標記' }))

    expect(props.onJump).toHaveBeenCalledWith(3)
  })

  it('shows an empty message and a reset button when no question matches', async () => {
    const user = userEvent.setup()
    const onFilterChange = vi.fn()
    const unmarkedItems = filterItems.map((item) => ({ ...item, marked: false }))
    renderNavigator({
      items: unmarkedItems,
      total: 5,
      filter: 'marked',
      onFilterChange,
    })

    const nav = screen.getByRole('navigation', { name: '題號列表' })
    expect(within(nav).getByText('沒有符合條件的題目')).toBeInTheDocument()
    expect(within(nav).queryByRole('button', { name: /^第 / })).not.toBeInTheDocument()

    await user.click(within(nav).getByRole('button', { name: '顯示全部' }))

    expect(onFilterChange).toHaveBeenCalledWith('all')
  })
})
