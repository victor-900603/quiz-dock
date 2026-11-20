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

describe('mobile viewport styles', () => {
  it('blocks pinch zoom while keeping panning available', () => {
    expect(css).toContain('touch-action: pan-x pan-y')
  })

  it('uses a shared sidebar width variable', () => {
    expect(css).toContain('--sidebar-width: 15rem')
    expect(css).toContain('--sidebar-width: 4.5rem')
  })

  it('keeps form fields at 16px on mobile to avoid iOS focus zoom', () => {
    expect(css).toContain('@media (max-width: 1023px)')
    expect(css).toContain('font-size: 16px')
  })
})
