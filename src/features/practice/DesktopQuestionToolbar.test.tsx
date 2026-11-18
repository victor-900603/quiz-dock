import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DesktopQuestionToolbar } from './DesktopQuestionToolbar'

type Props = Parameters<typeof DesktopQuestionToolbar>[0]

function renderToolbar(overrides: Partial<Props> = {}) {
  const props: Props = {
    index: 1,
    total: 5,
    navigatorOpen: false,
    onPrevious: vi.fn(),
    onNext: vi.fn(),
    onToggleNavigator: vi.fn(),
    ...overrides,
  }

  render(<DesktopQuestionToolbar {...props} />)

  return {
    props,
    trigger: () => screen.getByRole('button', { name: /練習工具列/ }),
    previous: () => screen.getByRole('button', { name: '前一題' }),
    next: () => screen.getByRole('button', { name: '後一題' }),
  }
}

describe('DesktopQuestionToolbar', () => {
  it('always shows the three controls', () => {
    const { previous, next, trigger } = renderToolbar()

    expect(previous()).toBeInTheDocument()
    expect(next()).toBeInTheDocument()
    expect(trigger()).toBeInTheDocument()
  })

  it('shows the current position in the middle control', () => {
    const { trigger } = renderToolbar({ index: 2, total: 8 })

    expect(trigger()).toHaveTextContent('3/8')
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
    expect(trigger()).toHaveAttribute('aria-controls', 'question-navigator-panel')
  })

  it('keeps the controls visible while the navigator is open', () => {
    const { previous, next, trigger } = renderToolbar({ navigatorOpen: true })

    expect(trigger()).toHaveAttribute('aria-expanded', 'true')
    expect(trigger()).toHaveAccessibleName(/題號列表已展開/)
    expect(previous()).toBeInTheDocument()
    expect(next()).toBeInTheDocument()
  })

  it('toggles the navigator from the middle control', async () => {
    const user = userEvent.setup()
    const { props, trigger } = renderToolbar()

    await user.click(trigger())

    expect(props.onToggleNavigator).toHaveBeenCalledTimes(1)
  })

  it('closes the navigator with Escape', () => {
    const { props } = renderToolbar({ navigatorOpen: true })

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(props.onToggleNavigator).toHaveBeenCalledTimes(1)
  })

  it('closes the navigator on an outside pointer down', () => {
    const { props } = renderToolbar({ navigatorOpen: true })

    fireEvent.pointerDown(document.body)

    expect(props.onToggleNavigator).toHaveBeenCalledTimes(1)
  })

  it('keeps the navigator open when clicking inside it', () => {
    const { props } = renderToolbar({ navigatorOpen: true })
    const navigator = document.createElement('div')
    navigator.setAttribute('data-question-navigator', '')
    document.body.appendChild(navigator)

    fireEvent.pointerDown(navigator)

    expect(props.onToggleNavigator).not.toHaveBeenCalled()
    navigator.remove()
  })

  it('moves to the previous and next question', async () => {
    const user = userEvent.setup()
    const { props, previous, next } = renderToolbar()

    await user.click(next())
    await user.click(previous())

    expect(props.onNext).toHaveBeenCalledTimes(1)
    expect(props.onPrevious).toHaveBeenCalledTimes(1)
  })

  it('disables navigation at the edges', () => {
    const first = renderToolbar({ index: 0, total: 2 })
    expect(first.previous()).toBeDisabled()
    expect(first.next()).toBeEnabled()
  })

  it('disables the next control on the last question', () => {
    const { previous, next } = renderToolbar({ index: 4, total: 5 })

    expect(previous()).toBeEnabled()
    expect(next()).toBeDisabled()
  })
})
