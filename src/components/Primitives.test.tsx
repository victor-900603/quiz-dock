import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AccuracySummary } from './AccuracySummary'
import { Button } from './Button'
import { EmptyState } from './EmptyState'
import { ExplanationPanel } from './ExplanationPanel'
import { MarkButton } from './MarkButton'
import { ProgressBar } from './ProgressBar'
import { TopicBars } from './TopicBars'

describe('AccuracySummary', () => {
  it('shows a dash when no questions were answered', () => {
    render(<AccuracySummary correct={0} answered={0} />)
    expect(screen.getByText('--')).toBeInTheDocument()
    expect(screen.getByText('答對 0 / 已答 0')).toBeInTheDocument()
  })
})

describe('TopicBars', () => {
  it('shows an empty label when there are no topics', () => {
    render(<TopicBars topics={[]} emptyLabel="沒有資料" />)
    expect(screen.getByText('沒有資料')).toBeInTheDocument()
  })

  it('uses the warning color below 60 percent and the accent color otherwise', () => {
    render(
      <TopicBars
        topics={[
          { name: '低分主題', answered: 10, correct: 5 },
          { name: '高分主題', answered: 10, correct: 8 },
          { name: '未作答', answered: 0, correct: 0 },
        ]}
      />,
    )

    expect(screen.getByText('50.0%')).toHaveClass('text-wrong')
    expect(screen.getByText('80.0%')).toHaveClass('text-muted')
    expect(screen.getAllByText('--')).toHaveLength(2)
  })
})

describe('ProgressBar', () => {
  it('builds the default label and handles a zero total', () => {
    const { rerender } = render(<ProgressBar answered={2} total={5} />)
    expect(screen.getByText('第 3 / 5 題')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2')

    rerender(<ProgressBar answered={0} total={0} label="自訂" />)
    expect(screen.getByText('自訂')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
  })
})

describe('Button', () => {
  it('supports variants, loading, and disabled state', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    const { rerender } = render(
      <Button variant="danger" onClick={onClick}>
        刪除
      </Button>,
    )

    expect(screen.getByRole('button', { name: '刪除' })).toHaveClass('text-wrong')
    await user.click(screen.getByRole('button', { name: '刪除' }))
    expect(onClick).toHaveBeenCalledTimes(1)

    rerender(
      <Button variant="ghost" loading onClick={onClick}>
        載入中
      </Button>,
    )
    expect(screen.getByRole('button', { name: '載入中' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '載入中' }).querySelector('svg')).toHaveClass('animate-spin')
  })
})

describe('ExplanationPanel', () => {
  it('renders answer labels and the fallback explanation', () => {
    const { rerender } = render(<ExplanationPanel correctAnswers={['A', 'B']} explanation="說明" />)
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
    expect(screen.getByText('說明')).toBeInTheDocument()

    rerender(<ExplanationPanel correctAnswers={[]} explanation="" />)
    expect(screen.getByText('本題沒有解析')).toBeInTheDocument()
  })
})

describe('EmptyState', () => {
  it('renders optional icon and action', () => {
    const { rerender } = render(
      <EmptyState icon={<span>圖示</span>} title="沒有題庫" description="先匯入" action={<button>匯入</button>} />,
    )
    expect(screen.getByText('圖示')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '匯入' })).toBeInTheDocument()

    rerender(<EmptyState title="沒有題庫" description="先匯入" />)
    expect(screen.queryByText('圖示')).not.toBeInTheDocument()
  })
})

describe('MarkButton', () => {
  it('switches labels and pressed state', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    const { rerender } = render(<MarkButton marked={false} onToggle={onToggle} />)

    expect(screen.getByRole('button', { name: '標記題目' })).toHaveAttribute('aria-pressed', 'false')
    await user.click(screen.getByRole('button', { name: '標記題目' }))
    expect(onToggle).toHaveBeenCalledTimes(1)

    rerender(<MarkButton marked onToggle={onToggle} />)
    expect(screen.getByRole('button', { name: '取消標記' })).toHaveAttribute('aria-pressed', 'true')
  })
})
