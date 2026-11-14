import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { OfflineNotice } from './OfflineNotice'

const originalDescriptor = Object.getOwnPropertyDescriptor(navigator, 'onLine')

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value,
  })
}

describe('OfflineNotice', () => {
  afterEach(() => {
    if (originalDescriptor) {
      Object.defineProperty(navigator, 'onLine', originalDescriptor)
    }
  })

  it('shows the offline notice and hides it when back online', () => {
    setOnline(false)
    render(<OfflineNotice />)

    expect(screen.getByRole('status')).toHaveTextContent('目前離線')
    expect(screen.getByRole('status')).toHaveTextContent('練習與儲存需要網路連線')

    act(() => {
      setOnline(true)
      window.dispatchEvent(new Event('online'))
    })

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('renders nothing while online', () => {
    setOnline(true)
    const { container } = render(<OfflineNotice />)

    expect(container).toBeEmptyDOMElement()
  })
})
