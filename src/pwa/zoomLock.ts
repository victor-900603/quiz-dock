const gestureEvents = ['gesturestart', 'gesturechange', 'gestureend'] as const

function preventDefault(event: Event): void {
  if (event.cancelable) event.preventDefault()
}

function preventMultiTouch(event: Event): void {
  const touches = (event as TouchEvent).touches
  if (touches && touches.length > 1) preventDefault(event)
}

/**
 * 關閉行動裝置的手勢縮放。iOS Safari 不理會 viewport 的 user-scalable=no，
 * 因此額外攔截 WebKit 的 gesture 事件與兩指以上的 touchmove。
 */
export function initZoomLock(target: Document = document): () => void {
  gestureEvents.forEach((name) => {
    target.addEventListener(name, preventDefault, { passive: false })
  })
  target.addEventListener('touchmove', preventMultiTouch, { passive: false })

  return () => {
    gestureEvents.forEach((name) => {
      target.removeEventListener(name, preventDefault)
    })
    target.removeEventListener('touchmove', preventMultiTouch)
  }
}
