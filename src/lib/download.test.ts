import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadTextFile } from './download'

describe('downloadTextFile', () => {
  const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:quiz-dock')
  const revokeObjectURL = vi.fn()

  beforeEach(() => {
    Object.assign(URL, { createObjectURL, revokeObjectURL })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    createObjectURL.mockClear()
    revokeObjectURL.mockClear()
  })

  it('creates a temporary link and releases the object URL', () => {
    let download = ''
    let href = ''
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      function click(this: HTMLAnchorElement) {
        download = this.download
        href = this.href
      },
    )

    downloadTextFile('生物學.json', '{"questions":[]}')

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(createObjectURL.mock.calls[0][0]).toBeInstanceOf(Blob)
    expect(download).toBe('生物學.json')
    expect(href).toBe('blob:quiz-dock')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:quiz-dock')
    expect(document.querySelector('a')).toBeNull()
  })
})
