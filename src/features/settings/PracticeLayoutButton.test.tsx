import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PracticeLayoutButton } from './PracticeLayoutButton'
import {
  practiceLayoutStorageKey,
  resetPracticeLayout,
} from './practiceLayout'

describe('PracticeLayoutButton', () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetPracticeLayout()
  })

  afterEach(() => {
    resetPracticeLayout()
  })

  it('starts unpressed in the stacked layout', () => {
    render(<PracticeLayoutButton />)

    const button = screen.getByRole('button', { name: '左右版面' })
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(button).toHaveAttribute('title', '切換為左右版面')
  })

  it('toggles the layout and remembers it', async () => {
    const user = userEvent.setup()
    render(<PracticeLayoutButton />)

    await user.click(screen.getByRole('button', { name: '左右版面' }))

    const button = screen.getByRole('button', { name: '左右版面' })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(button).toHaveAttribute('title', '切換為上下版面')
    expect(button).not.toHaveClass('border-accent', 'bg-accent-soft', 'text-accent')
    expect(window.localStorage.getItem(practiceLayoutStorageKey)).toBe('split')
  })

  it('reads a stored split layout on render', () => {
    window.localStorage.setItem(practiceLayoutStorageKey, 'split')

    render(<PracticeLayoutButton />)

    expect(screen.getByRole('button', { name: '左右版面' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})
