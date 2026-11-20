import { afterEach, describe, expect, it } from 'vitest'
import { initZoomLock } from './zoomLock'

let cleanup: (() => void) | null = null

afterEach(() => {
  cleanup?.()
  cleanup = null
})

function dispatchEvent(type: string): Event {
  const event = new Event(type, { cancelable: true })
  document.dispatchEvent(event)
  return event
}

function dispatchTouchMove(touchCount: number): Event {
  const event = new Event('touchmove', { cancelable: true })
  Object.defineProperty(event, 'touches', {
    value: Array.from({ length: touchCount }, () => ({})),
  })
  document.dispatchEvent(event)
  return event
}

describe('zoom lock', () => {
  it('blocks WebKit gesture events', () => {
    cleanup = initZoomLock()

    expect(dispatchEvent('gesturestart').defaultPrevented).toBe(true)
    expect(dispatchEvent('gesturechange').defaultPrevented).toBe(true)
    expect(dispatchEvent('gestureend').defaultPrevented).toBe(true)
  })

  it('blocks touchmove with more than one finger', () => {
    cleanup = initZoomLock()

    expect(dispatchTouchMove(1).defaultPrevented).toBe(false)
    expect(dispatchTouchMove(2).defaultPrevented).toBe(true)
    expect(dispatchTouchMove(3).defaultPrevented).toBe(true)
  })

  it('stops blocking after cleanup', () => {
    const release = initZoomLock()
    release()

    expect(dispatchEvent('gesturestart').defaultPrevented).toBe(false)
    expect(dispatchTouchMove(2).defaultPrevented).toBe(false)
  })
})
