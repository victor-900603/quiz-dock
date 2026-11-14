export function isStandalone(win: Pick<Window, 'matchMedia'> = window): boolean {
  if (typeof win.matchMedia !== 'function') return false
  return win.matchMedia('(display-mode: standalone)').matches
}

export function isIosDevice(
  nav: Pick<Navigator, 'userAgent' | 'platform' | 'maxTouchPoints'> = navigator,
): boolean {
  return (
    /iphone|ipad|ipod/i.test(nav.userAgent) ||
    (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1)
  )
}
