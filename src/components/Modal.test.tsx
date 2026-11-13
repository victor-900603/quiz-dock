import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

describe('Modal', () => {
  it('renders an accessible dialog and closes with Escape', () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="測試視窗" description="說明" footer={<button>確定</button>}>
        <p>內容</p>
      </Modal>,
    )

    expect(screen.getByRole('dialog', { name: '測試視窗' })).toBeInTheDocument()
    expect(document.body.style.overflow).toBe('hidden')

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes from the close button and overlay', () => {
    const onClose = vi.fn()
    const { rerender } = render(
      <Modal open onClose={onClose} title="測試視窗">
        <p>內容</p>
      </Modal>,
    )

    fireEvent.click(screen.getByRole('button', { name: '關閉' }))
    expect(onClose).toHaveBeenCalledTimes(1)

    const overlay = screen.getByRole('dialog').parentElement!
    fireEvent.mouseDown(overlay)
    expect(onClose).toHaveBeenCalledTimes(2)

    rerender(
      <Modal open={false} onClose={onClose} title="測試視窗">
        <p>內容</p>
      </Modal>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe('')
  })

  it('keeps focus when the parent re-renders with a new onClose', () => {
    const firstClose = vi.fn()
    const secondClose = vi.fn()
    const { rerender } = render(
      <Modal open onClose={firstClose} title="測試視窗">
        <input aria-label="測試輸入" />
      </Modal>,
    )

    const input = screen.getByLabelText('測試輸入')
    input.focus()
    expect(input).toHaveFocus()

    rerender(
      <Modal open onClose={secondClose} title="測試視窗">
        <input aria-label="測試輸入" />
      </Modal>,
    )

    expect(input).toHaveFocus()
  })
})
