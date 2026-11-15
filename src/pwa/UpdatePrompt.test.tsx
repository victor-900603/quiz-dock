import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UpdatePrompt } from './UpdatePrompt'
import { resetPwaStore, setNeedRefresh } from './pwaStore'

function deferred() {
  let resolve!: () => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, resolve, reject }
}

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

  it('shows progress while the update is being applied', async () => {
    const user = userEvent.setup()
    const pending = deferred()
    const updateSW = vi.fn(() => pending.promise)
    setNeedRefresh(updateSW)
    render(<UpdatePrompt />)

    await user.click(screen.getByRole('button', { name: '重新載入' }))

    expect(updateSW).toHaveBeenCalledWith(true)
    expect(screen.getByRole('button', { name: '更新中...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '稍後' })).toBeDisabled()
    expect(
      screen.getByText('正在套用新版本，完成後會自動重新載入。'),
    ).toBeInTheDocument()

    await act(async () => {
      pending.resolve()
    })

    expect(
      screen.getByRole('button', { name: '重新載入中...' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('已套用新版本，正在重新載入...'),
    ).toBeInTheDocument()
  })

  it('shows an error and allows retrying when the update fails', async () => {
    const user = userEvent.setup()
    const pending = deferred()
    const updateSW = vi.fn(() => pending.promise)
    setNeedRefresh(updateSW)
    render(<UpdatePrompt />)

    await user.click(screen.getByRole('button', { name: '重新載入' }))
    await act(async () => {
      pending.reject(new Error('failed'))
    })

    expect(screen.getByRole('alert')).toHaveTextContent(
      '更新失敗，請檢查網路後再試一次。',
    )

    const retry = screen.getByRole('button', { name: '重新載入' })
    expect(retry).toBeEnabled()
    expect(screen.getByRole('button', { name: '稍後' })).toBeEnabled()

    await user.click(retry)

    expect(updateSW).toHaveBeenCalledTimes(2)
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
