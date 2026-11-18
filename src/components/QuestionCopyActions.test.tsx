import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QuestionCopyActions } from './QuestionCopyActions'
import { copyText } from '../lib/clipboard'
import type { Question } from '../types/quiz'

vi.mock('../lib/clipboard', () => ({ copyText: vi.fn() }))

const mockedCopyText = vi.mocked(copyText)

const question: Question = {
  id: 'q-1',
  number: 3,
  topic: '細胞結構',
  prompt: '下列哪一個胞器負責產生 ATP？',
  options: [
    { key: 'A', text: '細胞核' },
    { key: 'B', text: '粒線體' },
  ],
  correctAnswers: ['B'],
  explanation: '粒線體是產生 ATP 的主要場所。',
}

function renderActions() {
  return render(<QuestionCopyActions question={question} />)
}

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('QuestionCopyActions', () => {
  it('copies the question and options, then confirms', async () => {
    mockedCopyText.mockResolvedValue(true)
    renderActions()

    fireEvent.click(
      screen.getByRole('button', { name: '複製第 3 題的題目與選項' }),
    )

    expect(await screen.findByText('已複製')).toBeInTheDocument()
    expect(mockedCopyText).toHaveBeenCalledWith(
      '#003 細胞結構\n下列哪一個胞器負責產生 ATP？\n\nA. 細胞核\nB. 粒線體',
    )
  })

  it('reports a failed copy', async () => {
    mockedCopyText.mockResolvedValue(false)
    renderActions()

    fireEvent.click(
      screen.getByRole('button', { name: '複製第 3 題的題目與選項' }),
    )

    expect(await screen.findByText('複製失敗')).toBeInTheDocument()
  })

  it('returns to the default label after a moment', async () => {
    vi.useFakeTimers()
    mockedCopyText.mockResolvedValue(true)
    renderActions()

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: '複製第 3 題的題目與選項' }),
      )
    })
    expect(screen.getByText('已複製')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1500)
    })
    expect(screen.getByText('複製')).toBeInTheDocument()
  })
})
