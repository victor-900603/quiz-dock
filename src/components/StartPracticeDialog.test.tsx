import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { StartPracticeDialog } from './StartPracticeDialog'
import type { PracticeProgress } from '../types/quiz'

function session(overrides: Partial<PracticeProgress> = {}): PracticeProgress {
  return {
    id: 'session-1',
    setId: 'set-1',
    mode: 'sequential',
    status: 'completed',
    answered: 5,
    correct: 3,
    total: 5,
    sourceSessionId: null,
    startedAt: '2026-11-15T10:00:00.000Z',
    completedAt: '2026-11-15T10:10:00.000Z',
    updatedAt: '2026-11-15T10:10:00.000Z',
    ...overrides,
  }
}

function renderDialog(overrides: {
  sessions?: PracticeProgress[]
  totalQuestions?: number
  onStart?: (options: {
    mode: 'sequential' | 'random'
    limit: number | null
    sourceSessionId: string | null
  }) => Promise<void> | void
} = {}) {
  const onStart = overrides.onStart ?? vi.fn()
  const onClose = vi.fn()
  render(
    <StartPracticeDialog
      open
      title="生物學基礎"
      totalQuestions={overrides.totalQuestions ?? 20}
      sessions={overrides.sessions ?? []}
      onClose={onClose}
      onStart={onStart}
    />,
  )

  return { onStart, onClose }
}

describe('StartPracticeDialog', () => {
  it('starts with every question in order by default', async () => {
    const user = userEvent.setup()
    const { onStart } = renderDialog()

    expect(screen.getByText(/共 20 題/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '開始練習' }))

    expect(onStart).toHaveBeenCalledWith({
      mode: 'sequential',
      limit: null,
      sourceSessionId: null,
    })
  })

  it('starts a random practice with a custom question count', async () => {
    const user = userEvent.setup()
    const { onStart } = renderDialog()

    await user.click(screen.getByRole('radio', { name: '隨機' }))
    await user.click(screen.getByRole('radio', { name: '自訂題數' }))
    const input = screen.getByLabelText('題數')
    await user.clear(input)
    await user.type(input, '5')
    await user.click(screen.getByRole('button', { name: '開始練習' }))

    expect(onStart).toHaveBeenCalledWith({
      mode: 'random',
      limit: 5,
      sourceSessionId: null,
    })
  })

  it('rejects a question count above the available total', async () => {
    const user = userEvent.setup()
    const { onStart } = renderDialog()

    await user.click(screen.getByRole('radio', { name: '自訂題數' }))
    const input = screen.getByLabelText('題數')
    await user.clear(input)
    await user.type(input, '99')
    await user.click(screen.getByRole('button', { name: '開始練習' }))

    expect(screen.getByRole('alert')).toHaveTextContent('題數不可超過 20 題。')
    expect(onStart).not.toHaveBeenCalled()
  })

  it('uses the wrong answers of the selected finished session', async () => {
    const user = userEvent.setup()
    const { onStart } = renderDialog({
      sessions: [
        session({ id: 'with-wrong' }),
        session({ id: 'all-correct', correct: 5 }),
        session({ id: 'active', status: 'in_progress' }),
      ],
    })

    await user.click(screen.getByRole('radio', { name: /某次練習的錯題/ }))
    expect(screen.getByText(/只會挑出該場答錯的 2 題。/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '開始練習' }))

    expect(onStart).toHaveBeenCalledWith({
      mode: 'sequential',
      limit: null,
      sourceSessionId: 'with-wrong',
    })
  })

  it('disables the wrong-answer scope without a finished session', () => {
    renderDialog({
      sessions: [session({ id: 'all-correct', correct: 5 })],
    })

    expect(
      screen.getByRole('radio', { name: /某次練習的錯題/ }),
    ).toBeDisabled()
  })

  it('shows an error from the start request', async () => {
    const user = userEvent.setup()
    renderDialog({
      onStart: () => Promise.reject(new Error('無法建立練習。')),
    })

    await user.click(screen.getByRole('button', { name: '開始練習' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('無法建立練習。')
  })

  it('keeps the dialog open until the start request succeeds', async () => {
    const user = userEvent.setup()
    let resolveStart: (() => void) | undefined
    const onStart = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveStart = resolve
        }),
    )
    renderDialog({ onStart })

    await user.click(screen.getByRole('button', { name: '開始練習' }))
    expect(onStart).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('dialog', { name: '開始練習' })).toBeInTheDocument()

    resolveStart?.()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '開始練習' })).toBeEnabled(),
    )
  })
})

describe('StartPracticeDialog scope details', () => {
  it('shows the wrong-answer count for the selected session', async () => {
    const user = userEvent.setup()
    renderDialog({
      sessions: [
        session({ id: 'one', answered: 4, correct: 1 }),
        session({ id: 'two', answered: 10, correct: 6 }),
      ],
    })

    await user.click(screen.getByRole('radio', { name: /某次練習的錯題/ }))
    await user.selectOptions(screen.getByLabelText('錯題來源'), 'two')

    expect(
      within(screen.getByLabelText('錯題來源')).getByRole('option', {
        name: /答對 6 \/ 10 題/,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/只會挑出該場答錯的 4 題。/)).toBeInTheDocument()
  })
})
