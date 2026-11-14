import { describe, expect, it, vi } from 'vitest'
import { isIosDevice, isStandalone } from './device'

describe('device', () => {
  it('detects the standalone display mode', () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: true })
    const win = { matchMedia } as unknown as Pick<Window, 'matchMedia'>

    expect(isStandalone(win)).toBe(true)
    expect(matchMedia).toHaveBeenCalledWith('(display-mode: standalone)')
  })

  it('returns false without a usable matchMedia', () => {
    const win = {} as Pick<Window, 'matchMedia'>

    expect(isStandalone(win)).toBe(false)
  })

  it('detects iPhone and iPad user agents', () => {
    expect(
      isIosDevice({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
        platform: 'iPhone',
        maxTouchPoints: 5,
      }),
    ).toBe(true)

    expect(
      isIosDevice({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        platform: 'MacIntel',
        maxTouchPoints: 5,
      }),
    ).toBe(true)
  })

  it('treats desktop browsers as non-iOS', () => {
    expect(
      isIosDevice({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        platform: 'Win32',
        maxTouchPoints: 0,
      }),
    ).toBe(false)

    expect(
      isIosDevice({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        platform: 'MacIntel',
        maxTouchPoints: 0,
      }),
    ).toBe(false)
  })
})
