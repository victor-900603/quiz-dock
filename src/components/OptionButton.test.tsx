import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OptionButton } from './OptionButton'

describe('OptionButton', () => {
  it('renders a selectable radio in single-answer mode', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()

    render(
      <OptionButton
        option={{ key: 'A', text: '細胞核' }}
        selected={false}
        status="idle"
        multi={false}
        onClick={onClick}
      />,
    )

    const button = screen.getByRole('radio', { name: /A.*細胞核/ })
    expect(button).toHaveAttribute('aria-checked', 'false')
    await user.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('uses aria-pressed in multi-answer mode', () => {
    render(
      <OptionButton
        option={{ key: 'B', text: '粒線體' }}
        selected
        status="selected"
        multi
        onClick={() => undefined}
      />,
    )

    expect(screen.getByRole('button', { name: /B.*粒線體/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('marks correct, wrong, and missed options', () => {
    const { rerender } = render(
      <OptionButton
        option={{ key: 'C', text: '光能' }}
        selected
        status="correct"
        multi={false}
        onClick={() => undefined}
      />,
    )

    expect(screen.getByRole('radio')).toHaveClass('border-correct', 'bg-correct-soft')

    rerender(
      <OptionButton
        option={{ key: 'C', text: '光能' }}
        selected
        status="wrong"
        multi={false}
        onClick={() => undefined}
      />,
    )
    expect(screen.getByRole('radio')).toHaveClass('border-wrong', 'bg-wrong-soft')

    rerender(
      <OptionButton
        option={{ key: 'C', text: '光能' }}
        selected={false}
        status="missed"
        multi={false}
        onClick={() => undefined}
      />,
    )
    expect(screen.getByRole('radio')).toHaveClass('border-correct', 'bg-correct-soft')
  })

  it('does not call onClick when disabled', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()

    render(
      <OptionButton
        option={{ key: 'D', text: '核糖體' }}
        selected={false}
        status="idle"
        disabled
        multi={false}
        onClick={onClick}
      />,
    )

    await user.click(screen.getByRole('radio'))
    expect(onClick).not.toHaveBeenCalled()
  })
})
