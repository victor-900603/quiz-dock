import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TestAuthProvider } from '../test/TestAuthProvider'
import {
  initSidebar,
  resetSidebar,
  sidebarStorageKey,
} from '../features/settings/sidebar'
import { AppShell } from './AppShell'

function renderShell() {
  return render(
    <TestAuthProvider>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<p>題庫內容</p>} />
            <Route path="/marks" element={<p>標記內容</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </TestAuthProvider>,
  )
}

describe('AppShell sidebar', () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetSidebar()
  })

  afterEach(() => {
    resetSidebar()
  })

  it('starts expanded and keeps the navigation labels accessible', () => {
    renderShell()

    const toggle = screen.getByRole('button', { name: '收合側邊欄' })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle).toHaveAttribute('aria-controls', 'app-sidebar')

    const sidebar = document.getElementById('app-sidebar') as HTMLElement
    expect(within(sidebar).getByRole('link', { name: '標記' })).toBeInTheDocument()
    expect(within(sidebar).getByText('victor@example.com')).toBeInTheDocument()
  })

  it('collapses to an icon rail and persists the state', async () => {
    const user = userEvent.setup()
    renderShell()

    await user.click(screen.getByRole('button', { name: '收合側邊欄' }))

    const toggle = screen.getByRole('button', { name: '展開側邊欄' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(window.localStorage.getItem(sidebarStorageKey)).toBe('collapsed')
    expect(document.documentElement.dataset.sidebar).toBe('collapsed')

    const sidebar = document.getElementById('app-sidebar') as HTMLElement
    expect(within(sidebar).getByRole('link', { name: '標記' })).toBeInTheDocument()
    expect(within(sidebar).getByText('標記')).toHaveClass('sr-only')
    expect(within(sidebar).getByText(/victor@example\.com/)).toHaveClass('sr-only')
    expect(within(sidebar).getByText('V')).toHaveAttribute('title', 'victor@example.com')
  })

  it('expands again when toggled back', async () => {
    const user = userEvent.setup()
    renderShell()

    await user.click(screen.getByRole('button', { name: '收合側邊欄' }))
    await user.click(screen.getByRole('button', { name: '展開側邊欄' }))

    expect(screen.getByRole('button', { name: '收合側邊欄' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(window.localStorage.getItem(sidebarStorageKey)).toBe('expanded')
    expect(document.documentElement.dataset.sidebar).toBe('expanded')
  })

  it('restores a collapsed state from storage on load', () => {
    window.localStorage.setItem(sidebarStorageKey, 'collapsed')
    initSidebar()

    renderShell()

    expect(screen.getByRole('button', { name: '展開側邊欄' })).toBeInTheDocument()
    expect(document.documentElement.dataset.sidebar).toBe('collapsed')
  })

  it('ignores an invalid stored state', () => {
    window.localStorage.setItem(sidebarStorageKey, 'tiny')
    initSidebar()

    renderShell()

    expect(screen.getByRole('button', { name: '收合側邊欄' })).toBeInTheDocument()
    expect(document.documentElement.dataset.sidebar).toBe('expanded')
  })
})
