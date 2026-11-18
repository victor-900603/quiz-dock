import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { PracticeHeader } from './PracticeHeader'

type HeaderProps = Parameters<typeof PracticeHeader>[0]

function renderHeader(overrides: Partial<HeaderProps> = {}) {
  const props: HeaderProps = {
    setId: 'set-1',
    title: '生物學基礎',
    mode: 'sequential',
    index: 2,
    total: 10,
    answered: 4,
    correct: 3,
    onOpenReadingScale: vi.fn(),
    onOpenTheme: vi.fn(),
    ...overrides,
  }

  render(
    <MemoryRouter>
      <PracticeHeader {...props} />
    </MemoryRouter>,
  )

  return props
}

describe('PracticeHeader', () => {
  it('shows the set, mode, position, correct count and progress', () => {
    renderHeader()

    expect(screen.getByRole('link', { name: '返回題庫' })).toHaveAttribute(
      'href',
      '/sets/set-1',
    )
    expect(screen.getByText('生物學基礎')).toBeInTheDocument()
    expect(screen.getByText('依序')).toBeInTheDocument()
    expect(screen.getByText(/第 3 \/ 10 題/)).toBeInTheDocument()
    expect(screen.getByText(/答對 3/)).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '4')
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuetext',
      '已答 4 / 10 題',
    )
  })

  it('shows the random mode tag', () => {
    renderHeader({ mode: 'random' })

    expect(screen.getByText('隨機')).toHaveAttribute('title', '隨機模式')
  })

  it('opens the reading scale dialog', async () => {
    const user = userEvent.setup()
    const props = renderHeader()

    await user.click(screen.getByRole('button', { name: '調整字級' }))

    expect(props.onOpenReadingScale).toHaveBeenCalledTimes(1)
  })
})
