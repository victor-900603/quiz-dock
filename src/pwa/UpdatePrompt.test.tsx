import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UpdatePrompt } from './UpdatePrompt'
import { resetPwaStore, setNeedRefresh } from './pwaStore'

describe('UpdatePrompt', () => {
  beforeEach(() => {
    resetPwaStore()
  })

  it('renders nothing without a pending update', () => {
    const { container } = render(<UpdatePrompt />)

    expect(container).toBeEmptyDOMElement()
  })

  it('dismisses the prompt', async () => {
    const user = userEvent.setup()
    setNeedRefresh(vi.fn().mockResolvedValue(undefined))
    render(<UpdatePrompt />)

    expect(screen.getByText('有新版本可用')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '稍後' }))

    expect(screen.queryByText('有新版本可用')).not.toBeInTheDocument()
  })

  it('reloads with the new service worker', async () => {
    const user = userEvent.setup()
    const updateSW = vi.fn().mockResolvedValue(undefined)
    setNeedRefresh(updateSW)
    render(<UpdatePrompt />)

    await user.click(screen.getByRole('button', { name: '重新載入' }))

    expect(updateSW).toHaveBeenCalledWith(true)
  })
})
