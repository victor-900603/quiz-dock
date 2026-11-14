import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useOnlineStatus } from './useOnlineStatus'

const originalDescriptor = Object.getOwnPropertyDescriptor(navigator, 'onLine')

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value,
  })
}

describe('useOnlineStatus', () => {
  afterEach(() => {
    if (originalDescriptor) {
      Object.defineProperty(navigator, 'onLine', originalDescriptor)
    }
  })

  it('follows online and offline events', () => {
    setOnline(true)
    const { result } = renderHook(() => useOnlineStatus())

    expect(result.current).toBe(true)

    act(() => {
      setOnline(false)
      window.dispatchEvent(new Event('offline'))
    })

    expect(result.current).toBe(false)

    act(() => {
      setOnline(true)
      window.dispatchEvent(new Event('online'))
    })

    expect(result.current).toBe(true)
  })
})
