import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ActionMenu } from './ActionMenu'

function renderMenu() {
  const onSelect = vi.fn()
  render(
    <MemoryRouter>
      <ActionMenu
        label="11/13 的練習操作"
        items={[
          { label: '查看摘要', href: '/results/session-1' },
          { label: '刪除', danger: true, onSelect },
        ]}
      />
    </MemoryRouter>,
  )

  return { onSelect }
}

describe('ActionMenu', () => {
  it('opens the menu and exposes its actions', async () => {
    const user = userEvent.setup()
    renderMenu()

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    const trigger = screen.getByRole('button', { name: '11/13 的練習操作' })
    await user.click(trigger)

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: '查看摘要' })).toHaveAttribute(
      'href',
      '/results/session-1',
    )
  })

  it('runs an action and closes the menu', async () => {
    const user = userEvent.setup()
    const { onSelect } = renderMenu()

    await user.click(screen.getByRole('button', { name: '11/13 的練習操作' }))
    await user.click(screen.getByRole('menuitem', { name: '刪除' }))

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('closes when Escape is pressed', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.click(screen.getByRole('button', { name: '11/13 的練習操作' }))
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('closes when clicking outside', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.click(screen.getByRole('button', { name: '11/13 的練習操作' }))
    await user.click(document.body)

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
