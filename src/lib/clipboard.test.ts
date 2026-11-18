import { afterEach, describe, expect, it, vi } from 'vitest'
import { copyText } from './clipboard'

function setClipboard(writeText?: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    value: writeText ? { writeText } : undefined,
    configurable: true,
  })
}

function setExecCommand(impl?: () => boolean) {
  Object.defineProperty(document, 'execCommand', {
    value: impl,
    configurable: true,
  })
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'clipboard')
  Reflect.deleteProperty(document, 'execCommand')
  vi.restoreAllMocks()
})

describe('copyText', () => {
  it('writes through the clipboard API', async () => {
    const writeText = vi.fn(async () => {})
    setClipboard(writeText)

    await expect(copyText('題目內容')).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('題目內容')
  })

  it('falls back when the clipboard API rejects', async () => {
    setClipboard(vi.fn(async () => Promise.reject(new Error('denied'))))
    const execCommand = vi.fn(() => true)
    setExecCommand(execCommand)

    await expect(copyText('備援內容')).resolves.toBe(true)
    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(document.querySelector('textarea')).toBeNull()
  })

  it('reports failure when both paths fail', async () => {
    setClipboard(vi.fn(async () => Promise.reject(new Error('denied'))))
    setExecCommand(() => false)

    await expect(copyText('內容')).resolves.toBe(false)
  })

  it('reports failure when the legacy path throws', async () => {
    setClipboard(undefined)
    setExecCommand(() => {
      throw new Error('unsupported')
    })

    await expect(copyText('內容')).resolves.toBe(false)
    expect(document.querySelector('textarea')).toBeNull()
  })
})
