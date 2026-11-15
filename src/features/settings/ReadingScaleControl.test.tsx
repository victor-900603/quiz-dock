import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ReadingScaleButton,
  ReadingScaleDialog,
  ReadingScaleOptions,
} from './ReadingScaleControl'
import { readingSizeStorageKey, resetReadingSize } from './readingScale'

describe('ReadingScaleOptions', () => {
  beforeEach(() => {
    resetReadingSize()
  })

  it('shows the current size and applies a new one immediately', async () => {
    const user = userEvent.setup()
    render(<ReadingScaleOptions />)

    expect(screen.getByRole('radio', { name: '標準' })).toBeChecked()

    await user.click(screen.getByRole('radio', { name: '特大' }))

    expect(screen.getByRole('radio', { name: '特大' })).toBeChecked()
    expect(screen.getByRole('radio', { name: '標準' })).not.toBeChecked()
    expect(localStorage.getItem(readingSizeStorageKey)).toBe('xlarge')
    expect(document.documentElement.dataset.readingSize).toBe('xlarge')
  })

  it('renders a preview with the reading prompt style', () => {
    render(<ReadingScaleOptions />)

    expect(screen.getByText(/閱讀字級預覽/)).toHaveClass('reading-prompt')
  })
})

describe('ReadingScaleDialog', () => {
  beforeEach(() => {
    resetReadingSize()
  })

  it('renders the size options inside the dialog', () => {
    render(<ReadingScaleDialog open onClose={vi.fn()} />)

    expect(screen.getByRole('dialog', { name: '字級' })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: '閱讀字級' })).toBeInTheDocument()
  })

  it('closes with Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ReadingScaleDialog open onClose={onClose} />)

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders nothing when closed', () => {
    const { container } = render(<ReadingScaleDialog open={false} onClose={vi.fn()} />)

    expect(container).toBeEmptyDOMElement()
  })
})

describe('ReadingScaleButton', () => {
  it('calls the handler when pressed', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<ReadingScaleButton onClick={onClick} />)

    await user.click(screen.getByRole('button', { name: '調整字級' }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
