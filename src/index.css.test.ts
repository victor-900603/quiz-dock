import { describe, expect, it } from 'vitest'
import css from './index.css?raw'

describe('global cursor styles', () => {
  it('uses a pointer cursor for clickable controls', () => {
    expect(css).toContain('button:not(:disabled)')
    expect(css).toContain('[role="button"]:not([aria-disabled="true"])')
    expect(css).toContain('label:has(> input[type="radio"])')
    expect(css).toContain('cursor: pointer')
  })

  it('shows a not-allowed cursor for disabled controls', () => {
    expect(css).toContain('button:disabled')
    expect(css).toContain('[aria-disabled="true"]')
    expect(css).toContain('cursor: not-allowed')
  })
})
