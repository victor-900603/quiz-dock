import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AnswerReview } from './AnswerReview'

describe('AnswerReview', () => {
  it('marks the correct options and shows the explanation', () => {
    render(
      <AnswerReview
        options={[
          { key: 'A', text: '第一個選項' },
          { key: 'B', text: '第二個選項' },
        ]}
        correctAnswers={['B']}
        explanation="這是解析"
      />,
    )

    expect(screen.getByText('選項')).toBeInTheDocument()
    expect(screen.getByText('第一個選項')).toBeInTheDocument()
    expect(screen.getByText('第二個選項')).toBeInTheDocument()
    expect(screen.getByText('正確答案')).toBeInTheDocument()
    expect(screen.getByText('解析')).toBeInTheDocument()
    expect(screen.getByText('這是解析')).toBeInTheDocument()
  })

  it('falls back when the question has no explanation', () => {
    render(
      <AnswerReview
        options={[{ key: 'A', text: '唯一的選項' }]}
        correctAnswers={['A']}
        explanation=""
      />,
    )

    expect(screen.getByText('本題沒有解析')).toBeInTheDocument()
  })
})
