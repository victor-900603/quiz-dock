import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { QuestionCard } from './QuestionCard'
import type { Question } from '../types/quiz'

const singleQuestion: Question = {
  id: 'q-1',
  number: 1,
  topic: '細胞結構',
  prompt: '下列哪一個構造負責調控物質進出細胞？',
  options: [
    { key: 'A', text: '細胞核' },
    { key: 'B', text: '細胞膜' },
  ],
  correctAnswers: ['B'],
  explanation: '細胞膜具有選擇透性。',
}

const multiQuestion: Question = {
  ...singleQuestion,
  id: 'q-2',
  number: 2,
  prompt: '下列哪些構造具有膜？',
  correctAnswers: ['A', 'B'],
}

function renderCard(overrides: Partial<Parameters<typeof QuestionCard>[0]> = {}) {
  const props: Parameters<typeof QuestionCard>[0] = {
    question: singleQuestion,
    selected: [],
    submitted: false,
    editing: false,
    marked: false,
    isLast: false,
    onToggleOption: vi.fn(),
    onToggleMark: vi.fn(),
    onSubmit: vi.fn(),
    onNext: vi.fn(),
    onEdit: vi.fn(),
    onCancelEdit: vi.fn(),
    ...overrides,
  }

  return { ...render(<QuestionCard {...props} />), props }
}

describe('QuestionCard', () => {
  it('disables submit until an option is selected', async () => {
    const user = userEvent.setup()
    const { props, rerender } = renderCard()

    expect(screen.getByRole('button', { name: '確認答案' })).toBeDisabled()
    await user.click(screen.getByRole('radio', { name: /B.*細胞膜/ }))
    expect(props.onToggleOption).toHaveBeenCalledWith('B')

    rerender(<QuestionCard {...props} selected={['B']} />)
    await user.click(screen.getByRole('button', { name: '確認答案' }))
    expect(props.onSubmit).toHaveBeenCalledTimes(1)
  })

  it('shows correct feedback and the explanation after submitting', () => {
    renderCard({ selected: ['B'], submitted: true })

    expect(screen.getByText('答對了')).toBeInTheDocument()
    expect(screen.getByText('細胞膜具有選擇透性。')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '下一題' })).toBeInTheDocument()
  })

  it('enters edit mode from submitted feedback', async () => {
    const user = userEvent.setup()
    const { props } = renderCard({ selected: ['B'], submitted: true })

    await user.click(screen.getByRole('button', { name: '修改答案' }))
    expect(props.onEdit).toHaveBeenCalledTimes(1)
  })

  it('allows changing the selected option while editing', async () => {
    const user = userEvent.setup()
    const { props } = renderCard({ selected: ['B'], submitted: true, editing: true })

    expect(screen.queryByText('答對了')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '更新答案' })).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: /A.*細胞核/ }))
    expect(props.onToggleOption).toHaveBeenCalledWith('A')

    await user.click(screen.getByRole('button', { name: '取消修改' }))
    expect(props.onCancelEdit).toHaveBeenCalledTimes(1)
  })

  it('shows wrong feedback and the last-question action', async () => {
    const user = userEvent.setup()
    const { props } = renderCard({ selected: ['A'], submitted: true, isLast: true })

    expect(screen.getByText('答錯了')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '查看摘要' }))
    expect(props.onNext).toHaveBeenCalledTimes(1)
  })

  it('supports multi-answer questions and marking', async () => {
    const user = userEvent.setup()
    const { props } = renderCard({
      question: multiQuestion,
      selected: ['A'],
      marked: true,
    })

    expect(screen.getByText('選出所有正確答案')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: '選項' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '取消標記' }))
    expect(props.onToggleMark).toHaveBeenCalledTimes(1)
  })
})
