import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { Question } from '../../types/quiz'
import { QuestionBrowser } from './QuestionBrowser'

function question(number: number, overrides: Partial<Question> = {}): Question {
  return {
    id: `question-${number}`,
    number,
    topic: '細胞',
    prompt: `題目 ${number}`,
    options: [
      { key: 'A', text: `選項甲 ${number}` },
      { key: 'B', text: '選項乙' },
    ],
    correctAnswers: ['A'],
    explanation: `解析 ${number}`,
    ...overrides,
  }
}

function manyQuestions(count: number) {
  return Array.from({ length: count }, (_, index) => question(index + 1))
}

describe('QuestionBrowser', () => {
  it('shows twenty questions at a time and loads more', async () => {
    const { container } = render(<QuestionBrowser questions={manyQuestions(25)} />)

    expect(screen.getByRole('status')).toHaveTextContent('顯示 20 / 25 題')
    expect(container.querySelectorAll('details')).toHaveLength(20)

    await userEvent.click(screen.getByRole('button', { name: '載入更多' }))

    expect(screen.getByRole('status')).toHaveTextContent('顯示 25 / 25 題')
    expect(container.querySelectorAll('details')).toHaveLength(25)
    expect(screen.queryByRole('button', { name: '載入更多' })).not.toBeInTheDocument()
  })

  it('matches the question prompt', async () => {
    const { container } = render(
      <QuestionBrowser
        questions={[question(1), question(2, { prompt: '第二題的題幹' }), question(3)]}
      />,
    )

    await userEvent.type(screen.getByLabelText('搜尋題目'), '第二題')

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('顯示 1 / 1 題')
    })
    expect(container.querySelectorAll('details')).toHaveLength(1)
  })

  it('matches option text and explanations', async () => {
    const questions = [
      question(1, {
        options: [
          { key: 'A', text: '粒線體' },
          { key: 'B', text: '細胞核' },
        ],
        explanation: '一般解析',
      }),
      question(2, {
        prompt: '光合作用發生在哪裡？',
        explanation: '葉綠體負責光合作用',
      }),
    ]
    render(<QuestionBrowser questions={questions} />)

    await userEvent.type(screen.getByLabelText('搜尋題目'), '粒線體')
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('顯示 1 / 1 題')
    })

    await userEvent.clear(screen.getByLabelText('搜尋題目'))
    await userEvent.type(screen.getByLabelText('搜尋題目'), '葉綠體')
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('顯示 1 / 1 題')
    })
    expect(screen.getByText('#002')).toBeInTheDocument()
  })

  it('matches a question number exactly', async () => {
    render(
      <QuestionBrowser
        questions={[
          question(1, { prompt: '細胞的基本單位' }),
          question(10, { prompt: '遺傳物質' }),
          question(12, { prompt: '細胞分裂' }),
        ]}
      />,
    )

    await userEvent.type(screen.getByLabelText('搜尋題目'), '12')

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('顯示 1 / 1 題')
    })
    expect(screen.getByText('#012')).toBeInTheDocument()
  })

  it('filters by topic', async () => {
    const questions = [
      ...Array.from({ length: 21 }, (_, index) => question(index + 1)),
      question(22, { topic: '遺傳', prompt: '遺傳題目' }),
    ]
    const { container } = render(<QuestionBrowser questions={questions} />)

    await userEvent.click(screen.getByRole('button', { name: '載入更多' }))
    expect(container.querySelectorAll('details')).toHaveLength(22)

    await userEvent.selectOptions(screen.getByLabelText('依主題篩選'), '遺傳')

    expect(screen.getByRole('status')).toHaveTextContent('顯示 1 / 1 題')
    expect(screen.getByText('#022')).toBeInTheDocument()
    expect(screen.queryByText('#001')).not.toBeInTheDocument()
  })

  it('resets the visible count when the search changes', async () => {
    render(<QuestionBrowser questions={manyQuestions(25)} />)

    await userEvent.click(screen.getByRole('button', { name: '載入更多' }))
    expect(screen.getByRole('status')).toHaveTextContent('顯示 25 / 25 題')

    await userEvent.type(screen.getByLabelText('搜尋題目'), '題目')

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('顯示 20 / 25 題')
    })
  })

  it('shows a message when nothing matches', async () => {
    render(<QuestionBrowser questions={manyQuestions(3)} />)

    await userEvent.type(screen.getByLabelText('搜尋題目'), '不存在')

    await waitFor(() => {
      expect(screen.getByText('找不到符合的題目。')).toBeInTheDocument()
    })
    expect(screen.getByRole('status')).toHaveTextContent('顯示 0 / 0 題')
  })

  it('renders options, correct answers, explanations, and marks', () => {
    render(
      <QuestionBrowser
        questions={[question(1, { explanation: '詳細解析' })]}
        markedQuestionIds={new Set(['question-1'])}
      />,
    )

    expect(screen.getByText('選項甲 1')).toBeInTheDocument()
    expect(screen.getByText('選項乙')).toBeInTheDocument()
    expect(screen.getAllByText('正確答案').length).toBeGreaterThan(0)
    expect(
      screen.getByRole('button', { name: '複製第 1 題的題目與選項' }),
    ).toBeInTheDocument()
    expect(screen.getByText('詳細解析')).toBeInTheDocument()
    expect(screen.getByText('已標記')).toBeInTheDocument()
  })

  it('shows an empty message when the set has no questions', () => {
    render(<QuestionBrowser questions={[]} />)

    expect(screen.getByText('這個題庫沒有題目。')).toBeInTheDocument()
    expect(screen.queryByLabelText('搜尋題目')).not.toBeInTheDocument()
  })
})
